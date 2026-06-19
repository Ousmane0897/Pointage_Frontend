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
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import { StockV2ValorisationService } from '../../../../services/stock-v2-valorisation.service';
import {
  AlerteCout,
  CoutProduit,
  FiltreCoutProduit,
  HistoriqueCoutProduit,
  MethodeValorisation,
  ParametrageValorisation,
} from '../../../../models/stock-v2-valorisation.model';
import { TypeProduit } from '../../../../models/stock-v2-produit.model';
import {
  LIBELLES_TYPE_PRODUIT,
  ORDRE_TYPES_PRODUIT,
  LIBELLES_UNITE,
  COULEURS_CHARTS,
  DEVISE,
} from '../../../../constants/stock.constants';
import {
  LIBELLES_METHODE_VALORISATION,
  COULEURS_METHODE_VALORISATION,
  ORDRE_METHODES,
  PARAMETRES_VALORISATION,
} from '../../../../constants/stock-v2-valorisation.constants';

const LIBELLES_ALERTE: Record<AlerteCout, string> = {
  METHODE_NON_DEFINIE: 'Méthode non définie',
  COUT_ZERO: 'Coût à 0',
  ECART_ANORMAL: 'Écart anormal',
};

/**
 * Coût unitaire par produit — Module Stock v2 / 7.6 (fonctionnalité 1).
 *
 * Paramétrage global de la méthode de valorisation + override par produit, coût
 * courant, alertes, et historique du coût (line chart) par produit.
 */
@Component({
  selector: 'app-cout-unitaire-produit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective],
  templateUrl: './cout-unitaire-produit.component.html',
  styleUrl: './cout-unitaire-produit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoutUnitaireProduitComponent implements OnInit, OnDestroy {

  parametrage: ParametrageValorisation | null = null;
  produits: CoutProduit[] = [];
  loading = false;
  savingParam = false;

  page = 0;
  size = PARAMETRES_VALORISATION.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreType = new FormControl<TypeProduit | ''>('', { nonNullable: true });
  filtreMethode = new FormControl<MethodeValorisation | ''>('', { nonNullable: true });
  filtreAlerte = new FormControl<boolean>(false, { nonNullable: true });

  expandedId: string | null = null;
  historique: HistoriqueCoutProduit | null = null;
  loadingHisto = false;
  lineData: ChartData<'line'> | null = null;
  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: false } },
  };

  readonly LIBELLES_TYPE_PRODUIT = LIBELLES_TYPE_PRODUIT;
  readonly TYPES = ORDRE_TYPES_PRODUIT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly LIBELLES_METHODE = LIBELLES_METHODE_VALORISATION;
  readonly COULEURS_METHODE = COULEURS_METHODE_VALORISATION;
  readonly METHODES = ORDRE_METHODES;
  readonly LIBELLES_ALERTE = LIBELLES_ALERTE;
  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2ValorisationService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.service.getParametrage()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: p => { this.parametrage = p; this.cdr.markForCheck(); }, error: () => {} });

    this.qControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 0; this.charger(); });

    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.loading = true;
    const filtres: FiltreCoutProduit = {
      q: this.qControl.value?.trim() || undefined,
      typeProduit: this.filtreType.value || undefined,
      methode: this.filtreMethode.value || undefined,
      avecAlerte: this.filtreAlerte.value || undefined,
    };
    this.service.listerCoutsProduits(this.page, this.size, filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.produits = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les coûts produits.'),
      });
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }
  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  // ─── Paramétrage global ───────────────────────────────────────────────────

  changerParametrage(methode: MethodeValorisation): void {
    this.savingParam = true;
    this.service.setParametrage({ methodeDefaut: methode })
      .pipe(finalize(() => { this.savingParam = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: p => { this.parametrage = p; this.toastr.success('Méthode globale mise à jour.'); this.charger(); },
        error: () => this.toastr.error('Mise à jour impossible.'),
      });
  }

  // ─── Override méthode par produit ─────────────────────────────────────────

  changerMethodeProduit(produit: CoutProduit, methode: MethodeValorisation): void {
    if (!produit.produitId) return;
    this.service.setMethodeProduit(produit.produitId, methode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success(`Méthode de « ${produit.produitLibelle} » mise à jour.`); this.charger(); },
        error: () => this.toastr.error('Mise à jour impossible.'),
      });
  }

  // ─── Détail / historique ──────────────────────────────────────────────────

  toggleDetail(produit: CoutProduit): void {
    if (this.expandedId === produit.produitId) { this.expandedId = null; this.historique = null; this.lineData = null; return; }
    this.expandedId = produit.produitId;
    this.historique = null;
    this.lineData = null;
    this.loadingHisto = true;
    this.service.getHistoriqueCout(produit.produitId)
      .pipe(finalize(() => { this.loadingHisto = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: h => { this.historique = h; this.construireChart(); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Historique indisponible.'),
      });
  }

  private construireChart(): void {
    const pts = this.historique?.points ?? [];
    if (pts.length === 0) { this.lineData = null; return; }
    this.lineData = {
      labels: pts.map(p => p.date),
      datasets: [{
        data: pts.map(p => p.cout),
        label: 'Coût unitaire (FCFA)',
        borderColor: COULEURS_CHARTS[0],
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true, tension: 0.3,
      }],
    };
  }

  classeAlerte(produit: CoutProduit): string {
    return produit.alertes.length > 0 ? 'bg-amber-50' : '';
  }

  trackById(_: number, p: CoutProduit): string { return p.produitId; }
}
