import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartOptions, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';

import { StockV2AnalyseMensuelleService } from '../../../../services/stock-v2-analyse-mensuelle.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  FiltreAnalyseMensuelle,
  LigneConsoMensuelle,
  SyntheseConsoMensuelle,
} from '../../../../models/stock-v2-analyse-mensuelle.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SiteClient } from '../../../../models/terrain-site-client.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { COULEURS_CHARTS, DEVISE, LIBELLES_UNITE } from '../../../../constants/stock.constants';

type ColonneTri = 'produit' | 'quantite' | 'cout' | 'evolution';

/**
 * Vue mensuelle par agence/site — Module Stock v2 / 7.5 (fonctionnalité 1).
 *
 * Tableau de bord analytique LECTURE SEULE : consommation détaillée par site et
 * par mois (ou plage de mois), avec KPIs, évolution (line), top 10 produits
 * (bar), répartition par catégorie (donut) et table triable. Exports PDF/Excel.
 */
@Component({
  selector: 'app-vue-mensuelle-site',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    BaseChartDirective,
    SelecteurSiteComponent,
  ],
  templateUrl: './vue-mensuelle-site.component.html',
  styleUrl: './vue-mensuelle-site.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VueMensuelleSiteComponent implements OnInit, OnDestroy {

  synthese: SyntheseConsoMensuelle | null = null;
  loading = false;
  categories: CategorieStock[] = [];
  siteCourantNom: string | null = null;

  triColonne: ColonneTri = 'cout';
  triAsc = false;

  readonly DEVISE = DEVISE;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;

  filtres = new FormGroup({
    mois: new FormControl<string>(this.moisCourant(), { nonNullable: true, validators: [Validators.required] }),
    moisFin: new FormControl<string>('', { nonNullable: true }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
  });

  // ─── Charts ────────────────────────────────────────────────────────────────
  lineData: ChartData<'line'> | null = null;
  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  barData: ChartData<'bar'> | null = null;
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  donutData: ChartData<'doughnut'> | null = null;
  readonly donutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2AnalyseMensuelleService,
    private categorieService: StockV2CategorieService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: cats => { this.categories = cats ?? []; this.cdr.markForCheck(); } });

    this.filtres.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.charger());

    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSiteSelectionne(site: SiteClient | null): void {
    this.siteCourantNom = site?.nom ?? null;
  }

  charger(): void {
    if (this.filtres.invalid) { return; }
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreAnalyseMensuelle = {
      mois: v.mois,
      moisFin: v.moisFin || undefined,
      siteId: v.siteId || undefined,
      categorieId: v.categorieId || undefined,
    };
    this.service.getSynthese(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: s => { this.synthese = s; this.appliquerTri(); this.construireCharts(); this.cdr.markForCheck(); },
        error: () => { this.synthese = null; this.toastr.error('Impossible de charger la consommation mensuelle.'); },
      });
  }

  private construireCharts(): void {
    const s = this.synthese;
    if (!s) { this.lineData = this.barData = this.donutData = null; return; }

    this.lineData = s.evolution.length ? {
      labels: s.evolution.map(p => p.mois),
      datasets: [{
        data: s.evolution.map(p => p.cout),
        label: 'Coût (FCFA)',
        borderColor: COULEURS_CHARTS[0],
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true, tension: 0.35,
      }],
    } : null;

    const top = s.topProduits.slice(0, 10);
    this.barData = top.length ? {
      labels: top.map(t => t.libelle),
      datasets: [{
        data: top.map(t => t.montant),
        label: 'Coût (FCFA)',
        backgroundColor: top.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    } : null;

    this.donutData = s.repartitionCategorie.length ? {
      labels: s.repartitionCategorie.map(r => r.libelle),
      datasets: [{
        data: s.repartitionCategorie.map(r => r.montant),
        backgroundColor: s.repartitionCategorie.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    } : null;
  }

  // ─── Tri de la table ───────────────────────────────────────────────────────

  trier(colonne: ColonneTri): void {
    if (this.triColonne === colonne) { this.triAsc = !this.triAsc; }
    else { this.triColonne = colonne; this.triAsc = false; }
    this.appliquerTri();
    this.cdr.markForCheck();
  }

  private appliquerTri(): void {
    if (!this.synthese) return;
    const sens = this.triAsc ? 1 : -1;
    this.synthese.lignes = [...this.synthese.lignes].sort((a, b) => {
      switch (this.triColonne) {
        case 'produit': return sens * (a.produitLibelle ?? '').localeCompare(b.produitLibelle ?? '');
        case 'quantite': return sens * (a.quantite - b.quantite);
        case 'cout': return sens * (a.cout - b.cout);
        case 'evolution': return sens * ((a.evolutionPct ?? 0) - (b.evolutionPct ?? 0));
      }
    });
  }

  // ─── Exports ─────────────────────────────────────────────────────────────

  exporterExcel(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterConsoMensuelle(this.synthese, this.libellePeriode());
  }

  exporterPdf(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.pdfService.genererConsoMensuelle(this.synthese, { periode: this.libellePeriode(), siteNom: this.siteCourantNom ?? undefined });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  libellePeriode(): string {
    const v = this.filtres.getRawValue();
    return v.moisFin && v.moisFin !== v.mois ? `${v.mois}_${v.moisFin}` : v.mois;
  }

  classeEvolution(pct?: number): string {
    if (pct == null || pct === 0) return 'text-gray-400';
    return pct > 0 ? 'text-red-600' : 'text-green-600';
  }

  trackByProduit(_: number, l: LigneConsoMensuelle): string { return l.produitId; }

  private moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
