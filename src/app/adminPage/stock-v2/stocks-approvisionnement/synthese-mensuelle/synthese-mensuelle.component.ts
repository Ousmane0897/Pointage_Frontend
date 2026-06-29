import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2SyntheseService } from '../../../../services/stock-v2-synthese.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import { SyntheseMensuelle, FiltreSynthese } from '../../../../models/stock-v2-synthese.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../shared/selecteur-site/selecteur-site.component';
import { LIBELLES_UNITE, COULEURS_CHARTS } from '../../../../constants/stock.constants';

@Component({
  selector: 'app-synthese-mensuelle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective, SelecteurSiteComponent],
  templateUrl: './synthese-mensuelle.component.html',
  styleUrl: './synthese-mensuelle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyntheseMensuelleComponent implements OnInit, OnDestroy {

  synthese: SyntheseMensuelle | null = null;
  loading = false;

  moisControl = new FormControl<string>(this.moisCourant(), { nonNullable: true });
  siteControl = new FormControl<string>('', { nonNullable: true });
  categorieControl = new FormControl<string>('', { nonNullable: true });

  categories: CategorieStock[] = [];

  readonly LIBELLES_UNITE = LIBELLES_UNITE;

  evolutionData: ChartData<'bar'> | null = null;
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2SyntheseService,
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
    const mois = this.moisControl.value;
    if (!mois) return;
    const filtres: FiltreSynthese = {
      mois,
      siteId: this.siteControl.value || undefined,
      categorieId: this.categorieControl.value || undefined,
    };
    this.loading = true;
    this.service.getSynthese(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: s => { this.synthese = s; this.construireChart(s); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de charger la synthèse.'),
      });
  }

  private construireChart(s: SyntheseMensuelle): void {
    // Top 12 produits par volume de mouvements (entrées + sorties)
    const top = [...s.lignes]
      .sort((a, b) => (b.entrees + b.sorties) - (a.entrees + a.sorties))
      .slice(0, 12);
    this.evolutionData = {
      labels: top.map(l => l.produitCode),
      datasets: [
        { label: 'Entrées', data: top.map(l => l.entrees), backgroundColor: COULEURS_CHARTS[1] },
        { label: 'Sorties', data: top.map(l => l.sorties), backgroundColor: COULEURS_CHARTS[3] },
        { label: 'Stock final', data: top.map(l => l.stockFinal), backgroundColor: COULEURS_CHARTS[0] },
      ],
    };
  }

  exporterExcel(): void {
    if (this.synthese) this.exportService.exporterSynthese(this.synthese);
  }

  exporterPdf(): void {
    if (this.synthese) this.pdfService.genererSynthese(this.synthese);
  }

  trackById(_: number, l: { produitId: string }): string { return l.produitId; }

  private moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
