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
import {
  SyntheseMultiMois,
  LigneSyntheseMulti,
  FluxSynthese,
} from '../../../../models/stock-v2-synthese.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../shared/selecteur-site/selecteur-site.component';
import {
  LIBELLES_UNITE,
  COULEURS_CHARTS,
  LIBELLES_FLUX_SYNTHESE,
  ORDRE_FLUX_SYNTHESE,
  formaterMois,
  formaterMoisCourt,
} from '../../../../constants/stock.constants';

/** Au-delà, on lancerait autant d'appels HTTP que de mois — et le tableau devient illisible. */
const MAX_MOIS_COMPARES = 12;
/** Nombre de produits représentés dans le graphique. */
const TOP_PRODUITS_CHART = 10;

@Component({
  selector: 'app-synthese-mensuelle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective, SelecteurSiteComponent],
  templateUrl: './synthese-mensuelle.component.html',
  styleUrl: './synthese-mensuelle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyntheseMensuelleComponent implements OnInit, OnDestroy {

  synthese: SyntheseMultiMois | null = null;
  /** Lignes triées par volume décroissant du flux affiché — recalculées à chaque changement de flux. */
  lignesAffichees: LigneSyntheseMulti[] = [];
  loading = false;

  /** Mois saisi dans le champ, avant ajout à la sélection. */
  moisSaisiControl = new FormControl<string>(this.moisCourant(), { nonNullable: true });
  /** Mois effectivement comparés, toujours triés chronologiquement et non vides. */
  moisSelectionnes: string[] = [this.moisCourant()];

  fluxControl = new FormControl<FluxSynthese>('TOUT', { nonNullable: true });

  siteControl = new FormControl<string>('', { nonNullable: true });
  categorieControl = new FormControl<string>('', { nonNullable: true });

  categories: CategorieStock[] = [];

  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly LIBELLES_FLUX = LIBELLES_FLUX_SYNTHESE;
  readonly ORDRE_FLUX = ORDRE_FLUX_SYNTHESE;
  readonly MAX_MOIS_COMPARES = MAX_MOIS_COMPARES;
  /** '2026-02' → 'Février 2026' — tuiles KPI et mentions « au … ». */
  readonly formaterMois = formaterMois;
  /** '2026-02' → 'Févr. 2026' — en-têtes de colonnes, puces et légende du graphique. */
  readonly formaterMoisCourt = formaterMoisCourt;

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

    // Le flux est purement cosmétique : on reconstruit le graphique sans rappeler le serveur.
    this.fluxControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.synthese) this.rafraichirVue(this.synthese);
        this.cdr.markForCheck();
      });

    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Sélection des mois ──────────────────────────────────────────────────

  ajouterMois(): void {
    const mois = this.moisSaisiControl.value;
    if (!mois) return;
    if (this.moisSelectionnes.includes(mois)) {
      this.toastr.info('Ce mois est déjà sélectionné.');
      return;
    }
    if (this.moisSelectionnes.length >= MAX_MOIS_COMPARES) {
      this.toastr.info(`${MAX_MOIS_COMPARES} mois maximum en comparaison.`);
      return;
    }
    this.moisSelectionnes = [...this.moisSelectionnes, mois].sort();
    this.cdr.markForCheck();
  }

  retirerMois(mois: string): void {
    if (this.moisSelectionnes.length <= 1) {
      this.toastr.info('Au moins un mois doit rester sélectionné.');
      return;
    }
    this.moisSelectionnes = this.moisSelectionnes.filter(m => m !== mois);
    this.cdr.markForCheck();
  }

  // ─── Chargement ──────────────────────────────────────────────────────────

  charger(): void {
    if (this.moisSelectionnes.length === 0) return;
    this.loading = true;
    this.service.getSyntheseMulti(
      this.moisSelectionnes,
      this.siteControl.value || undefined,
      this.categorieControl.value || undefined,
    )
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: s => { this.synthese = s; this.rafraichirVue(s); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de charger la synthèse.'),
      });
  }

  // ─── Dérivés d'affichage du flux ─────────────────────────────────────────

  get flux(): FluxSynthese { return this.fluxControl.value; }
  get afficheEntrees(): boolean { return this.flux !== 'SORTIE'; }
  get afficheSorties(): boolean { return this.flux !== 'ENTREE'; }
  /** Le stock initial n'a de sens qu'en vue complète. */
  get afficheStockInitial(): boolean { return this.flux === 'TOUT'; }
  /** Nombre de sous-colonnes rendues pour chaque mois. */
  get nbColonnesParMois(): number {
    return (this.afficheStockInitial ? 1 : 0) + (this.afficheEntrees ? 1 : 0) + (this.afficheSorties ? 1 : 0);
  }
  get dernierMois(): string { return this.synthese?.mois[this.synthese.mois.length - 1] ?? ''; }

  private mesureLigne(l: LigneSyntheseMulti): number {
    if (this.flux === 'ENTREE') return l.totalEntrees;
    if (this.flux === 'SORTIE') return l.totalSorties;
    return l.totalEntrees + l.totalSorties;
  }

  private mesureCellule(c: { entrees: number; sorties: number }): number {
    if (this.flux === 'ENTREE') return c.entrees;
    if (this.flux === 'SORTIE') return c.sorties;
    return c.entrees + c.sorties;
  }

  get libelleMesure(): string {
    if (this.flux === 'ENTREE') return 'Entrées';
    if (this.flux === 'SORTIE') return 'Sorties';
    return 'Entrées + sorties';
  }

  // ─── Tri + graphique ─────────────────────────────────────────────────────

  /** Retrie les lignes et reconstruit le graphique selon le flux courant. */
  private rafraichirVue(s: SyntheseMultiMois): void {
    this.lignesAffichees = [...s.lignes].sort((a, b) => this.mesureLigne(b) - this.mesureLigne(a));
    const top = this.lignesAffichees.slice(0, TOP_PRODUITS_CHART);
    this.evolutionData = {
      labels: top.map(l => l.produitCode),
      datasets: s.mois.map((m, index) => ({
        label: formaterMoisCourt(m),
        data: top.map(l => this.mesureCellule(l.parMois[index])),
        backgroundColor: COULEURS_CHARTS[index % COULEURS_CHARTS.length],
      })),
    };
  }

  // ─── Exports ─────────────────────────────────────────────────────────────

  exporterExcel(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) {
      this.toastr.info('Aucune donnée à exporter.');
      return;
    }
    this.exportService.exporterSynthese(this.synthese, this.flux);
  }

  exporterPdf(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) {
      this.toastr.info('Aucune donnée à exporter.');
      return;
    }
    this.pdfService.genererSynthese(this.synthese, this.flux);
  }

  trackById(_: number, l: { produitId: string }): string { return l.produitId; }
  trackByMois(_: number, m: string): string { return m; }

  private moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
