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
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2TableauBordService } from '../../../../services/stock-v2-tableau-bord.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  RapportTableauBordStock,
  FiltreTableauBordStock,
} from '../../../../models/stock-v2-tableau-bord.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../shared/selecteur-site/selecteur-site.component';
import { LIBELLES_UNITE, COULEURS_CHARTS, PARAMETRES_STOCK } from '../../../../constants/stock.constants';

@Component({
  selector: 'app-tableau-bord-stocks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective, SelecteurSiteComponent],
  templateUrl: './tableau-bord-stocks.component.html',
  styleUrl: './tableau-bord-stocks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableauBordStocksComponent implements OnInit, OnDestroy {

  rapport: RapportTableauBordStock | null = null;
  loading = false;

  categories: CategorieStock[] = [];

  filtres = new FormGroup({
    dateDebut: new FormControl<string>(this.dateDebutAnnee(), { nonNullable: true }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
  });

  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly MOIS_DORMANCE = PARAMETRES_STOCK.moisDormanceDefaut;

  // Charts
  valeurCategorieData: ChartData<'doughnut'> | null = null;
  evolutionData: ChartData<'line'> | null = null;
  topConsoData: ChartData<'bar'> | null = null;

  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } },
  };
  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
    elements: { line: { tension: 0.3 } },
  };
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2TableauBordService,
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
      .subscribe({ next: c => { this.categories = c ?? []; this.cdr.markForCheck(); }, error: () => {} });
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    const v = this.filtres.value;
    if (!v.dateDebut || !v.dateFin) return;
    const filtre: FiltreTableauBordStock = {
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      siteId: v.siteId || undefined,
      categorieId: v.categorieId || undefined,
      moisDormance: this.MOIS_DORMANCE,
    };
    this.loading = true;
    this.service.getRapport(filtre)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.rapport = r; this.construireCharts(r); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de charger le tableau de bord.'),
      });
  }

  private construireCharts(r: RapportTableauBordStock): void {
    this.valeurCategorieData = {
      labels: r.valeurParCategorie.map(v => v.categorie),
      datasets: [{
        data: r.valeurParCategorie.map(v => v.valeur),
        backgroundColor: [...COULEURS_CHARTS],
      }],
    };
    this.evolutionData = {
      labels: r.evolutionValeur.map(p => p.mois),
      datasets: [{
        label: 'Valeur du stock (FCFA)',
        data: r.evolutionValeur.map(p => p.valeur),
        borderColor: COULEURS_CHARTS[0],
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true,
      }],
    };
    this.topConsoData = {
      labels: r.topConsommations.map(c => c.produitLibelle),
      datasets: [{
        label: 'Quantité consommée',
        data: r.topConsommations.map(c => c.quantite),
        backgroundColor: COULEURS_CHARTS[3],
      }],
    };
  }

  exporterExcel(): void {
    if (this.rapport) this.exportService.exporterTableauBord(this.rapport);
  }

  exporterPdf(): void {
    if (this.rapport) {
      const v = this.filtres.value;
      this.pdfService.genererTableauBord(this.rapport, {
        dateDebut: v.dateDebut!,
        dateFin: v.dateFin!,
        siteId: v.siteId || undefined,
        categorieId: v.categorieId || undefined,
      });
    }
  }

  trackByDormant(_: number, d: { produitId: string }): string { return d.produitId; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutAnnee(): string {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  }
}
