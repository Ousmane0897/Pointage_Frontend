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
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';

import { StockV2AnalyseDonService } from '../../../../services/stock-v2-analyse-don.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  FiltreAnalyseDon,
  LigneDon,
  SyntheseDons,
} from '../../../../models/stock-v2-analyse-don.model';
import { NatureDon } from '../../../../models/stock-v2-bon-sortie.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import {
  COULEURS_CHARTS,
  DEVISE,
  LIBELLES_NATURE_DON,
  COULEURS_NATURE_DON,
  ORDRE_NATURES_DON,
} from '../../../../constants/stock.constants';

/**
 * Consommations dons — Module Stock v2 / 7.5 (fonctionnalité 3).
 *
 * Tableau de bord LECTURE SEULE des sorties de type DON (cadeaux clients,
 * échantillons, actions sociales, dons internes) valorisées en FCFA. KPIs,
 * répartition par nature (donut), top bénéficiaires (bar), évolution (line),
 * table filtrée. Exports PDF/Excel pour la comptabilité analytique.
 */
@Component({
  selector: 'app-consommations-dons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective, SelecteurSiteComponent],
  templateUrl: './consommations-dons.component.html',
  styleUrl: './consommations-dons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsommationsDonsComponent implements OnInit, OnDestroy {

  synthese: SyntheseDons | null = null;
  loading = false;

  readonly DEVISE = DEVISE;
  readonly LIBELLES_NATURE_DON = LIBELLES_NATURE_DON;
  readonly COULEURS_NATURE_DON = COULEURS_NATURE_DON;
  readonly NATURES = ORDRE_NATURES_DON;

  filtres = new FormGroup({
    dateDebut: new FormControl<string>(this.dateDebutAnnee(), { nonNullable: true, validators: [Validators.required] }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true, validators: [Validators.required] }),
    natureDon: new FormControl<NatureDon | ''>('', { nonNullable: true }),
    beneficiaire: new FormControl<string>('', { nonNullable: true }),
    siteId: new FormControl<string>('', { nonNullable: true }),
  });

  donutData: ChartData<'doughnut'> | null = null;
  readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  barData: ChartData<'bar'> | null = null;
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  lineData: ChartData<'line'> | null = null;
  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2AnalyseDonService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.filtres.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.charger());
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    if (this.filtres.invalid) return;
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreAnalyseDon = {
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      natureDon: v.natureDon || undefined,
      beneficiaire: v.beneficiaire?.trim() || undefined,
      siteId: v.siteId || undefined,
    };
    this.service.getSynthese(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: s => { this.synthese = s; this.construireCharts(); this.cdr.markForCheck(); },
        error: () => { this.synthese = null; this.toastr.error('Impossible de charger les dons.'); },
      });
  }

  private construireCharts(): void {
    const s = this.synthese;
    if (!s) { this.donutData = this.barData = this.lineData = null; return; }

    this.donutData = s.repartitionNature.length ? {
      labels: s.repartitionNature.map(r => r.libelle),
      datasets: [{
        data: s.repartitionNature.map(r => r.montant),
        backgroundColor: s.repartitionNature.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    } : null;

    const top = s.topBeneficiaires.slice(0, 10);
    this.barData = top.length ? {
      labels: top.map(t => t.libelle),
      datasets: [{
        data: top.map(t => t.montant),
        label: 'Montant (FCFA)',
        backgroundColor: top.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    } : null;

    this.lineData = s.evolutionMensuelle.length ? {
      labels: s.evolutionMensuelle.map(p => p.mois),
      datasets: [{
        data: s.evolutionMensuelle.map(p => p.montant),
        label: 'Montant (FCFA)',
        borderColor: COULEURS_CHARTS[4],
        backgroundColor: 'rgba(139,92,246,0.12)',
        fill: true, tension: 0.35,
      }],
    } : null;
  }

  exporterExcel(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterDons(this.synthese, this.libellePeriode());
  }

  exporterPdf(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.pdfService.genererDons(this.synthese, this.libellePeriode());
  }

  libellePeriode(): string {
    const v = this.filtres.getRawValue();
    return `${v.dateDebut}_${v.dateFin}`;
  }

  trackByLigne(_: number, l: LigneDon): string { return l.bonId ?? l.reference ?? `${l.date}`; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutAnnee(): string {
    return `${new Date().getFullYear()}-01-01`;
  }
}
