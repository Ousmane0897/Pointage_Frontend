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
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  RapportTableauBordStock,
  FiltreTableauBordStock,
} from '../../../../models/stock-v2-tableau-bord.model';
import { SelecteurSiteComponent } from '../shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../shared/selecteur-produit/selecteur-produit.component';
import {
  LIBELLES_UNITE,
  COULEURS_CHARTS,
  PARAMETRES_STOCK,
  premierJourDuMois,
  dernierJourDuMois,
  formaterMoisCourt,
} from '../../../../constants/stock.constants';

@Component({
  selector: 'app-tableau-bord-stocks',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective,
    SelecteurSiteComponent, SelecteurProduitComponent,
  ],
  templateUrl: './tableau-bord-stocks.component.html',
  styleUrl: './tableau-bord-stocks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableauBordStocksComponent implements OnInit, OnDestroy {

  rapport: RapportTableauBordStock | null = null;
  loading = false;

  // La saisie se fait en mois (yyyy-MM) ; les bornes jour envoyées au serveur en sont dérivées.
  filtres = new FormGroup({
    moisDebut: new FormControl<string>(this.moisDebutAnnee(), { nonNullable: true }),
    moisFin: new FormControl<string>(this.moisCourant(), { nonNullable: true }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    produitId: new FormControl<string>('', { nonNullable: true }),
  });

  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly MOIS_DORMANCE = PARAMETRES_STOCK.moisDormanceDefaut;

  // Charts
  valeurProduitData: ChartData<'doughnut'> | null = null;
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
    const filtre = this.construireFiltre();
    if (!filtre) return;
    this.loading = true;
    this.service.getRapport(filtre)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.rapport = r; this.construireCharts(r); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de charger le tableau de bord.'),
      });
  }

  /**
   * Convertit la plage de mois saisie en bornes jour attendues par le serveur.
   * Renvoie `null` (et prévient l'utilisateur) si la plage est inexploitable.
   */
  private construireFiltre(): FiltreTableauBordStock | null {
    const v = this.filtres.value;
    if (!v.moisDebut || !v.moisFin) return null;
    if (v.moisFin < v.moisDebut) {
      this.toastr.info('Le mois de fin précède le mois de début.');
      return null;
    }
    return {
      dateDebut: premierJourDuMois(v.moisDebut),
      dateFin: dernierJourDuMois(v.moisFin),
      siteId: v.siteId || undefined,
      produitId: v.produitId || undefined,
      moisDormance: this.MOIS_DORMANCE,
    };
  }

  private construireCharts(r: RapportTableauBordStock): void {
    // Repli sur [] : tant que le serveur renvoie l'ancien bloc par catégorie, le champ est absent.
    const valeurParProduit = r.valeurParProduit ?? [];
    this.valeurProduitData = {
      labels: valeurParProduit.map(v => v.produitLibelle),
      datasets: [{
        data: valeurParProduit.map(v => v.valeur),
        backgroundColor: [...COULEURS_CHARTS],
      }],
    };
    this.evolutionData = {
      labels: r.evolutionValeur.map(p => formaterMoisCourt(p.mois)),
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
    const filtre = this.construireFiltre();
    if (this.rapport && filtre) this.pdfService.genererTableauBord(this.rapport, filtre);
  }

  trackByDormant(_: number, d: { produitId: string }): string { return d.produitId; }

  private moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private moisDebutAnnee(): string {
    return `${new Date().getFullYear()}-01`;
  }
}
