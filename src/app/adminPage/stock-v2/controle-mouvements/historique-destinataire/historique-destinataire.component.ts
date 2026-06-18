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

import { StockV2ConsommationService } from '../../../../services/stock-v2-consommation.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  ConsommationDestinataire,
  FiltreConsommation,
} from '../../../../models/stock-v2-consommation.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import { COULEURS_CHARTS, DEVISE } from '../../../../constants/stock.constants';

/**
 * Historique de consommation par destinataire — Module Stock v2 / 7.4 (fonctionnalité 6).
 *
 * Consommation cumulée par site / agence / client sur une période, avec
 * graphique d'évolution du destinataire sélectionné et exports PDF/Excel.
 */
@Component({
  selector: 'app-historique-destinataire',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    BaseChartDirective,
    SelecteurSiteComponent,
    SelecteurProduitComponent,
  ],
  templateUrl: './historique-destinataire.component.html',
  styleUrl: './historique-destinataire.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoriqueDestinataireComponent implements OnInit, OnDestroy {

  consommations: ConsommationDestinataire[] = [];
  selection: ConsommationDestinataire | null = null;
  loading = false;

  readonly DEVISE = DEVISE;

  filtres = new FormGroup({
    siteId: new FormControl<string>('', { nonNullable: true }),
    produitId: new FormControl<string>('', { nonNullable: true }),
    dateDebut: new FormControl<string>(this.dateDebutAnnee(), { nonNullable: true }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true }),
  });

  evolutionData: ChartData<'line'> | null = null;
  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
    elements: { line: { tension: 0.3 } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2ConsommationService,
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
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreConsommation = {
      siteId: v.siteId || undefined,
      produitId: v.produitId || undefined,
      dateDebut: v.dateDebut || undefined,
      dateFin: v.dateFin || undefined,
    };
    this.service.parDestinataire(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.consommations = data ?? [];
          this.selection = this.consommations[0] ?? null;
          this.construireChart();
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger la consommation.'),
      });
  }

  selectionner(c: ConsommationDestinataire): void {
    this.selection = c;
    this.construireChart();
    this.cdr.markForCheck();
  }

  private construireChart(): void {
    const points = this.selection?.evolution ?? [];
    if (points.length === 0) { this.evolutionData = null; return; }
    this.evolutionData = {
      labels: points.map(p => p.periode),
      datasets: [{
        data: points.map(p => p.quantite),
        label: 'Quantité',
        borderColor: COULEURS_CHARTS[0],
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true,
      }],
    };
  }

  exporterExcel(): void {
    if (this.consommations.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterHistoriqueDestinataire(this.consommations);
  }

  exporterPdf(): void {
    if (this.consommations.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    const v = this.filtres.getRawValue();
    this.pdfService.genererHistoriqueDestinataire(this.consommations, { dateDebut: v.dateDebut, dateFin: v.dateFin });
  }

  estSelection(c: ConsommationDestinataire): boolean {
    return this.selection?.destinataireId === c.destinataireId;
  }

  trackById(_: number, c: ConsommationDestinataire): string { return c.destinataireId; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutAnnee(): string {
    return `${new Date().getFullYear()}-01-01`;
  }
}
