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
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2AnalyseComparatifService } from '../../../../services/stock-v2-analyse-comparatif.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  AxeComparatif,
  CelluleComparatif,
  FiltreComparatif,
  MatriceComparatif,
  SensEvolution,
} from '../../../../models/stock-v2-analyse-comparatif.model';
import { TypeSortie } from '../../../../models/stock-v2-bon-sortie.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import {
  COULEURS_CHARTS,
  DEVISE,
  LIBELLES_TYPE_SORTIE,
  ORDRE_TYPES_SORTIE,
  PARAMETRES_ANALYSE_CONSO,
} from '../../../../constants/stock.constants';

/**
 * Comparatif mensuel — Module Stock v2 / 7.5 (fonctionnalité 4).
 *
 * Matrice site/produit × mois colorisée (heatmap CSS) avec détection des dérives
 * (écart % vs mois précédent au-delà du seuil paramétrable) + multi-courbes
 * (un site/produit = une courbe). Exports PDF/Excel.
 */
@Component({
  selector: 'app-comparatif-mensuel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective, SelecteurSiteComponent],
  templateUrl: './comparatif-mensuel.component.html',
  styleUrl: './comparatif-mensuel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparatifMensuelComponent implements OnInit, OnDestroy {

  matrice: MatriceComparatif | null = null;
  loading = false;

  readonly DEVISE = DEVISE;
  readonly LIBELLES_TYPE_SORTIE = LIBELLES_TYPE_SORTIE;
  readonly TYPES_SORTIE = ORDRE_TYPES_SORTIE;
  readonly AXES: { value: AxeComparatif; libelle: string }[] = [
    { value: 'SITE', libelle: 'Par site' },
    { value: 'PRODUIT', libelle: 'Par produit' },
  ];

  filtres = new FormGroup({
    axe: new FormControl<AxeComparatif>('SITE', { nonNullable: true, validators: [Validators.required] }),
    dateDebut: new FormControl<string>(this.moisIlYAModeDe(5), { nonNullable: true, validators: [Validators.required] }),
    dateFin: new FormControl<string>(this.moisCourant(), { nonNullable: true, validators: [Validators.required] }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    typeSortie: new FormControl<TypeSortie | ''>('', { nonNullable: true }),
    seuilPct: new FormControl<number>(PARAMETRES_ANALYSE_CONSO.seuilSurconsommationPct, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
  });

  lineData: ChartData<'line'> | null = null;
  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2AnalyseComparatifService,
    private categorieService: StockV2CategorieService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    if (this.filtres.invalid) { this.toastr.warning('Période et seuil sont requis.'); return; }
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreComparatif = {
      axe: v.axe,
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      siteId: v.siteId || undefined,
      typeSortie: v.typeSortie || undefined,
      seuilPct: v.seuilPct,
    };
    this.service.getMatrice(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: m => { this.matrice = m; this.construireChart(); this.cdr.markForCheck(); },
        error: () => { this.matrice = null; this.toastr.error('Impossible de générer le comparatif.'); },
      });
  }

  private construireChart(): void {
    const m = this.matrice;
    if (!m || m.series.length === 0) { this.lineData = null; return; }
    this.lineData = {
      labels: m.mois,
      datasets: m.series.slice(0, 8).map((s, i) => ({
        data: s.data,
        label: s.label,
        borderColor: COULEURS_CHARTS[i % COULEURS_CHARTS.length],
        backgroundColor: 'transparent',
        tension: 0.3,
      })),
    };
  }

  /** Classe Tailwind de la cellule selon le sens d'évolution (heatmap). */
  classeCellule(sens: SensEvolution): string {
    switch (sens) {
      case 'ALERTE': return 'bg-red-100 text-red-800';
      case 'HAUSSE': return 'bg-amber-50 text-amber-700';
      case 'BAISSE': return 'bg-green-50 text-green-700';
      default: return 'text-gray-600';
    }
  }

  exporterExcel(): void {
    if (!this.matrice || this.matrice.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterComparatif(this.matrice);
  }

  exporterPdf(): void {
    if (!this.matrice || this.matrice.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.pdfService.genererComparatif(this.matrice);
  }

  trackByMois(_: number, m: string): string { return m; }
  trackByLigne(_: number, l: { cleId: string }): string { return l.cleId; }
  trackByCellule(_: number, c: CelluleComparatif): string { return c.mois; }

  private moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private moisIlYAModeDe(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
