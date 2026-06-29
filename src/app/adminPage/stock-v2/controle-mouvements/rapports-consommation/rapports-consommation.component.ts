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

import { StockV2ConsommationService } from '../../../../services/stock-v2-consommation.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  RapportConsommation,
  FiltreRapportConsommation,
  TypeRapportConsommation,
} from '../../../../models/stock-v2-consommation.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import { COULEURS_CHARTS, DEVISE } from '../../../../constants/stock.constants';

const LIBELLES_TYPE_RAPPORT: Record<TypeRapportConsommation, string> = {
  PAR_SITE: 'Par site',
  PAR_PRODUIT: 'Par produit',
  PAR_PERIODE: 'Par période',
};

/**
 * Rapports de consommation — Module Stock v2 / 7.4 (fonctionnalité 9).
 *
 * Génération à la demande de rapports détaillés (par site / produit / période)
 * avec indicateurs synthétiques et exports PDF/Excel.
 */
@Component({
  selector: 'app-rapports-consommation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    BaseChartDirective,
    SelecteurSiteComponent,
    SelecteurProduitComponent,
  ],
  templateUrl: './rapports-consommation.component.html',
  styleUrl: './rapports-consommation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RapportsConsommationComponent implements OnInit, OnDestroy {

  rapport: RapportConsommation | null = null;
  loading = false;
  categories: CategorieStock[] = [];

  readonly DEVISE = DEVISE;
  readonly LIBELLES_TYPE_RAPPORT = LIBELLES_TYPE_RAPPORT;
  readonly TYPES: TypeRapportConsommation[] = ['PAR_SITE', 'PAR_PRODUIT', 'PAR_PERIODE'];

  filtres = new FormGroup({
    type: new FormControl<TypeRapportConsommation>('PAR_SITE', { nonNullable: true, validators: [Validators.required] }),
    dateDebut: new FormControl<string>(this.dateDebutAnnee(), { nonNullable: true, validators: [Validators.required] }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true, validators: [Validators.required] }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    produitId: new FormControl<string>('', { nonNullable: true }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
  });

  barData: ChartData<'bar'> | null = null;
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2ConsommationService,
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generer(): void {
    if (this.filtres.invalid) { this.toastr.warning('Type et période sont requis.'); return; }
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreRapportConsommation = {
      type: v.type,
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      siteId: v.siteId || undefined,
      produitId: v.produitId || undefined,
      categorieId: v.categorieId || undefined,
    };
    this.service.rapport(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.rapport = r; this.construireChart(); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de générer le rapport.'),
      });
  }

  private construireChart(): void {
    const lignes = (this.rapport?.lignes ?? []).slice(0, 10);
    if (lignes.length === 0) { this.barData = null; return; }
    this.barData = {
      labels: lignes.map(l => l.libelle),
      datasets: [{
        data: lignes.map(l => l.montant),
        label: 'Montant',
        backgroundColor: lignes.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    };
  }

  exporterExcel(): void {
    if (!this.rapport || this.rapport.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterRapportConsommation(this.rapport);
  }

  exporterPdf(): void {
    if (!this.rapport || this.rapport.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.pdfService.genererRapportConsommation(this.rapport);
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
