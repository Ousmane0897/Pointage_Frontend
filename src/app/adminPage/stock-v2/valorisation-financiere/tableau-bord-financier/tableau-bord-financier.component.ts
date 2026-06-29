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

import { StockV2TableauBordFinancierService } from '../../../../services/stock-v2-tableau-bord-financier.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  DeriveBudgetaire,
  FiltreTableauBordFinancier,
  RapportTableauBordFinancier,
} from '../../../../models/stock-v2-tableau-bord-financier.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { COULEURS_CHARTS, DEVISE } from '../../../../constants/stock.constants';

/**
 * Tableau de bord financier des stocks — Module Stock v2 / 7.6 (fonctionnalité 7).
 *
 * Agrège valeur du stock, consommation, coûts par site, marge globale et dérives
 * budgétaires. KPIs + line (évolution valeur) + bar (coût/site) + donut + alertes.
 */
@Component({
  selector: 'app-tableau-bord-financier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective, SelecteurSiteComponent],
  templateUrl: './tableau-bord-financier.component.html',
  styleUrl: './tableau-bord-financier.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableauBordFinancierComponent implements OnInit, OnDestroy {

  rapport: RapportTableauBordFinancier | null = null;
  loading = false;
  categories: CategorieStock[] = [];

  filtres = new FormGroup({
    dateDebut: new FormControl<string>(this.dateDebutAnnee(), { nonNullable: true, validators: [Validators.required] }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true, validators: [Validators.required] }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
  });

  lineData: ChartData<'line'> | null = null;
  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: false } },
  };

  barData: ChartData<'bar'> | null = null;
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  donutData: ChartData<'doughnut'> | null = null;
  readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2TableauBordFinancierService,
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
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    if (this.filtres.invalid) { this.toastr.warning('La période est requise.'); return; }
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreTableauBordFinancier = {
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      siteId: v.siteId || undefined,
      categorieId: v.categorieId || undefined,
    };
    this.service.getRapport(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.rapport = r; this.construireCharts(); this.cdr.markForCheck(); },
        error: () => { this.rapport = null; this.toastr.error('Impossible de charger le tableau de bord.'); },
      });
  }

  private construireCharts(): void {
    const r = this.rapport;
    if (!r) { this.lineData = this.barData = this.donutData = null; return; }

    this.lineData = r.evolutionValeur.length ? {
      labels: r.evolutionValeur.map(p => p.mois),
      datasets: [{
        data: r.evolutionValeur.map(p => p.valeur),
        label: 'Valeur du stock (FCFA)',
        borderColor: COULEURS_CHARTS[0],
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true, tension: 0.35,
      }],
    } : null;

    const sites = r.coutParSite.slice(0, 10);
    this.barData = sites.length ? {
      labels: sites.map(s => s.siteNom),
      datasets: [{
        data: sites.map(s => s.cout),
        label: 'Coût (FCFA)',
        backgroundColor: sites.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    } : null;

    this.donutData = r.repartitionCategorie.length ? {
      labels: r.repartitionCategorie.map(c => c.categorie),
      datasets: [{
        data: r.repartitionCategorie.map(c => c.valeur),
        backgroundColor: r.repartitionCategorie.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    } : null;
  }

  exporterExcel(): void {
    if (!this.rapport) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterTableauBordFinancier(this.rapport);
  }

  exporterPdf(): void {
    if (!this.rapport) { this.toastr.info('Aucune donnée à exporter.'); return; }
    const v = this.filtres.getRawValue();
    this.pdfService.genererTableauBordFinancier(this.rapport, { dateDebut: v.dateDebut, dateFin: v.dateFin });
  }

  classeDerive(d: DeriveBudgetaire): string {
    return d.gravite === 'CRITIQUE' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  }

  trackByIndex(i: number): number { return i; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutAnnee(): string {
    return `${new Date().getFullYear()}-01-01`;
  }
}
