import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { Subject, interval } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { StockV2ValorisationService } from '../../../../services/stock-v2-valorisation.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import {
  FiltreValeurStock,
  LigneValeurProduit,
  PeriodeComparaison,
  ValeurStock,
} from '../../../../models/stock-v2-valorisation.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { COULEURS_CHARTS, DEVISE } from '../../../../constants/stock.constants';
import { PARAMETRES_VALORISATION } from '../../../../constants/stock-v2-valorisation.constants';

/**
 * Valeur du stock temps réel — Module Stock v2 / 7.6 (fonctionnalité 3).
 *
 * Valorisation globale Σ(quantité × coût) avec décomposition par catégorie,
 * comparaison à l'instant T précédent et rafraîchissement automatique (polling).
 */
@Component({
  selector: 'app-valeur-stock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective, SelecteurSiteComponent],
  templateUrl: './valeur-stock.component.html',
  styleUrl: './valeur-stock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValeurStockComponent implements OnInit, OnDestroy {

  valeur: ValeurStock | null = null;
  loading = false;
  rafraichissement = false;
  categories: CategorieStock[] = [];

  filtres = new FormGroup({
    siteId: new FormControl<string>('', { nonNullable: true }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
    comparer: new FormControl<PeriodeComparaison>('JOUR', { nonNullable: true }),
  });

  readonly COMPARAISONS: { value: PeriodeComparaison; libelle: string }[] = [
    { value: 'JOUR', libelle: 'Jour précédent' },
    { value: 'SEMAINE', libelle: 'Semaine précédente' },
    { value: 'MOIS', libelle: 'Mois précédent' },
  ];

  donutData: ChartData<'doughnut'> | null = null;
  readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2ValorisationService,
    private categorieService: StockV2CategorieService,
    private exportService: StockV2ExportService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: cats => { this.categories = cats ?? []; this.cdr.markForCheck(); } });

    // Rechargement complet (avec skeleton) à chaque changement de filtre.
    this.filtres.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.charger(false));

    // Polling : rafraîchissement silencieux périodique.
    interval(PARAMETRES_VALORISATION.intervalRefreshMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.charger(true));

    this.charger(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** @param silencieux true = rafraîchissement auto (pas de skeleton). */
  charger(silencieux: boolean): void {
    if (silencieux) this.rafraichissement = true; else this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreValeurStock = {
      siteId: v.siteId || undefined,
      categorieId: v.categorieId || undefined,
      comparer: v.comparer,
    };
    this.service.getValeurStock(filtres)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.valeur = res;
          this.construireChart();
          this.loading = false;
          this.rafraichissement = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.rafraichissement = false;
          if (!silencieux) this.toastr.error('Impossible de charger la valeur du stock.');
          this.cdr.markForCheck();
        },
      });
  }

  rafraichir(): void { this.charger(true); }

  private construireChart(): void {
    const r = this.valeur;
    if (!r || r.repartitionCategorie.length === 0) { this.donutData = null; return; }
    this.donutData = {
      labels: r.repartitionCategorie.map(c => c.categorie),
      datasets: [{
        data: r.repartitionCategorie.map(c => c.valeur),
        backgroundColor: r.repartitionCategorie.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    };
  }

  exporterExcel(): void {
    if (!this.valeur || this.valeur.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterValeurStock(this.valeur);
  }

  classeEcart(pct?: number): string {
    if (pct == null || pct === 0) return 'text-gray-400';
    return pct > 0 ? 'text-green-600' : 'text-red-600';
  }

  trackByProduit(_: number, l: LigneValeurProduit): string { return l.produitId; }
}
