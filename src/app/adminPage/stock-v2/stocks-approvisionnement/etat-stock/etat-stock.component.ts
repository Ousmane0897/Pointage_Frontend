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
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import { StockV2EtatStockService } from '../../../../services/stock-v2-etat-stock.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import {
  EtatStock,
  FiltreEtatStock,
  StatutStock,
} from '../../../../models/stock-v2-etat-stock.model';
import { TypeProduit } from '../../../../models/stock-v2-produit.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import {
  LIBELLES_STATUT_STOCK,
  COULEURS_STATUT_STOCK,
  LIBELLES_TYPE_PRODUIT,
  LIBELLES_UNITE,
  ORDRE_TYPES_PRODUIT,
  PARAMETRES_STOCK,
} from '../../../../constants/stock.constants';

@Component({
  selector: 'app-etat-stock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './etat-stock.component.html',
  styleUrl: './etat-stock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtatStockComponent implements OnInit, OnDestroy {

  etats: EtatStock[] = [];
  loading = false;
  derniereMaj: Date | null = null;

  page = 0;
  size = PARAMETRES_STOCK.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreCategorie = new FormControl<string>('', { nonNullable: true });
  filtreType = new FormControl<TypeProduit | ''>('', { nonNullable: true });
  filtreStatut = new FormControl<StatutStock | ''>('', { nonNullable: true });
  parSite = false;

  categories: CategorieStock[] = [];

  // Édition inline du seuil
  editId: string | null = null;
  editSeuilControl = new FormControl<number>(0, { nonNullable: true });

  readonly LIBELLES_STATUT_STOCK = LIBELLES_STATUT_STOCK;
  readonly COULEURS_STATUT_STOCK = COULEURS_STATUT_STOCK;
  readonly LIBELLES_TYPE_PRODUIT = LIBELLES_TYPE_PRODUIT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly TYPES = ORDRE_TYPES_PRODUIT;
  readonly STATUTS: StatutStock[] = ['RUPTURE', 'CRITIQUE', 'OK'];

  private destroy$ = new Subject<void>();

  constructor(
    private etatService: StockV2EtatStockService,
    private categorieService: StockV2CategorieService,
    private exportService: StockV2ExportService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.qControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 0; this.charger(); });

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
    this.loading = true;
    const filtres: FiltreEtatStock = {
      q: this.qControl.value?.trim() || undefined,
      categorieId: this.filtreCategorie.value || undefined,
      typeProduit: this.filtreType.value || undefined,
      statut: this.filtreStatut.value || undefined,
      parSite: this.parSite || undefined,
    };
    this.etatService.lister(this.page, this.size, filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.etats = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.derniereMaj = new Date();
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error("Impossible de charger l'état du stock."),
      });
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }

  reinitialiser(): void {
    this.qControl.setValue('', { emitEvent: false });
    this.filtreCategorie.setValue('', { emitEvent: false });
    this.filtreType.setValue('', { emitEvent: false });
    this.filtreStatut.setValue('', { emitEvent: false });
    this.parSite = false;
    this.page = 0;
    this.charger();
  }

  toggleParSite(): void { this.parSite = !this.parSite; this.page = 0; this.charger(); }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  exporter(): void {
    if (this.etats.length === 0) { this.toastr.info('Aucune donnée à exporter sur cette page.'); return; }
    this.exportService.exporterEtatStock(this.etats);
  }

  // ─── Édition inline du seuil ──────────────────────────────────────────────

  cleLigne(e: EtatStock): string {
    return `${e.produitId}-${e.siteId ?? 'all'}`;
  }

  demarrerEdition(e: EtatStock): void {
    this.editId = this.cleLigne(e);
    this.editSeuilControl.setValue(e.seuilAlerte);
    this.cdr.markForCheck();
  }

  annulerEdition(): void { this.editId = null; this.cdr.markForCheck(); }

  enregistrerSeuil(e: EtatStock): void {
    const seuil = this.editSeuilControl.value;
    if (seuil < 0) { this.toastr.warning('Le seuil doit être positif.'); return; }
    this.etatService.majSeuil({ produitId: e.produitId, siteId: e.siteId, seuilAlerte: seuil })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: maj => {
          e.seuilAlerte = maj.seuilAlerte;
          e.statut = maj.statut;
          this.editId = null;
          this.toastr.success('Seuil mis à jour.');
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Mise à jour du seuil impossible.'),
      });
  }

  trackByCle(_: number, e: EtatStock): string {
    return this.cleLigne(e);
  }
}
