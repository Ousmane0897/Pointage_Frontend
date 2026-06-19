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

import { StockV2CoutSiteService } from '../../../../services/stock-v2-cout-site.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import { ComparatifCoutSites, CoutSite, FiltreCoutSite } from '../../../../models/stock-v2-cout-site.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { COULEURS_CHARTS, DEVISE } from '../../../../constants/stock.constants';

/**
 * Coût de consommation par site — Module Stock v2 / 7.6 (fonctionnalité 4).
 *
 * Comparatif inter-sites des sorties valorisées, ranking (bar chart), détection
 * des surconsommations. Exports PDF/Excel.
 */
@Component({
  selector: 'app-cout-consommation-site',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective],
  templateUrl: './cout-consommation-site.component.html',
  styleUrl: './cout-consommation-site.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoutConsommationSiteComponent implements OnInit, OnDestroy {

  comparatif: ComparatifCoutSites | null = null;
  loading = false;
  categories: CategorieStock[] = [];

  filtres = new FormGroup({
    dateDebut: new FormControl<string>(this.dateDebutMois(), { nonNullable: true, validators: [Validators.required] }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true, validators: [Validators.required] }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
  });

  barData: ChartData<'bar'> | null = null;
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2CoutSiteService,
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
    const filtres: FiltreCoutSite = {
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      categorieId: v.categorieId || undefined,
    };
    this.service.getComparatif(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: c => { this.comparatif = c; this.construireChart(); this.cdr.markForCheck(); },
        error: () => { this.comparatif = null; this.toastr.error('Impossible de charger les coûts par site.'); },
      });
  }

  private construireChart(): void {
    const lignes = this.comparatif?.lignes ?? [];
    if (lignes.length === 0) { this.barData = null; return; }
    this.barData = {
      labels: lignes.map(l => l.siteNom),
      datasets: [{
        data: lignes.map(l => l.coutTotal),
        label: 'Coût (FCFA)',
        backgroundColor: lignes.map(l => l.surconsommation ? '#EF4444' : COULEURS_CHARTS[0]),
      }],
    };
  }

  exporterExcel(): void {
    if (!this.comparatif || this.comparatif.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterCoutSite(this.comparatif);
  }

  exporterPdf(): void {
    if (!this.comparatif || this.comparatif.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.pdfService.genererCoutSite(this.comparatif);
  }

  trackBySite(_: number, s: CoutSite): string { return s.siteId; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutMois(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
