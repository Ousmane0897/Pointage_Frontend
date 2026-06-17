import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import { StockV2ProduitService } from '../../../../../services/stock-v2-produit.service';
import { StockV2CategorieService } from '../../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../../services/stock-v2-export.service';
import { Produit, FiltreProduit, TypeProduit } from '../../../../../models/stock-v2-produit.model';
import { CategorieStock } from '../../../../../models/stock-v2-categorie.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import { ImportProduitsModalComponent } from '../import-produits-modal/import-produits-modal.component';
import { ResultatImport } from '../../../../../models/stock-v2-import.model';
import {
  LIBELLES_TYPE_PRODUIT,
  COULEURS_TYPE_PRODUIT,
  LIBELLES_UNITE,
  ORDRE_TYPES_PRODUIT,
  PARAMETRES_STOCK,
} from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-liste-produits',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-produits.component.html',
  styleUrl: './liste-produits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeProduitsComponent implements OnInit, OnDestroy {

  produits: Produit[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_STOCK.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreType = new FormControl<TypeProduit | ''>('', { nonNullable: true });
  filtreCategorie = new FormControl<string>('', { nonNullable: true });
  sousSeuil = false;
  actifSeulement = true;

  categories: CategorieStock[] = [];

  readonly LIBELLES_TYPE_PRODUIT = LIBELLES_TYPE_PRODUIT;
  readonly COULEURS_TYPE_PRODUIT = COULEURS_TYPE_PRODUIT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly TYPES = ORDRE_TYPES_PRODUIT;

  private destroy$ = new Subject<void>();

  constructor(
    private produitService: StockV2ProduitService,
    private categorieService: StockV2CategorieService,
    private exportService: StockV2ExportService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.qControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 0; this.charger(); });

    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: cats => { this.categories = cats ?? []; this.cdr.markForCheck(); },
        error: () => {},
      });

    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.loading = true;
    const filtres: FiltreProduit = {
      q: this.qControl.value?.trim() || undefined,
      typeProduit: this.filtreType.value || undefined,
      categorieId: this.filtreCategorie.value || undefined,
      sousSeuil: this.sousSeuil || undefined,
      actif: this.actifSeulement ? true : undefined,
    };
    this.produitService.lister(this.page, this.size, filtres)
      .pipe(
        finalize(() => { this.loading = false; this.cdr.markForCheck(); }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: res => {
          this.produits = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger le catalogue produits.'),
      });
  }

  appliquerFiltres(): void {
    this.page = 0;
    this.charger();
  }

  reinitialiser(): void {
    this.qControl.setValue('', { emitEvent: false });
    this.filtreType.setValue('', { emitEvent: false });
    this.filtreCategorie.setValue('', { emitEvent: false });
    this.sousSeuil = false;
    this.actifSeulement = true;
    this.page = 0;
    this.charger();
  }

  toggleSousSeuil(): void { this.sousSeuil = !this.sousSeuil; this.page = 0; this.charger(); }
  toggleActif(): void { this.actifSeulement = !this.actifSeulement; this.page = 0; this.charger(); }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  ouvrirImport(): void {
    const ref = this.dialog.open(ImportProduitsModalComponent, {
      width: 'auto',
      maxWidth: '92vw',
      panelClass: 'import-excel-dialog-panel',
      autoFocus: false,
      disableClose: true,
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((res: ResultatImport | null | undefined) => {
      if (res && res.succes > 0) { this.page = 0; this.charger(); }
    });
  }

  exporter(): void {
    if (this.produits.length === 0) {
      this.toastr.info('Aucun produit à exporter sur cette page.');
      return;
    }
    this.exportService.exporterProduits(this.produits);
  }

  supprimer(p: Produit): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Supprimer le produit « ${p.libelle} » (${p.code}) ?\nCette action est irréversible.`,
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok || !p.id) return;
      this.produitService.supprimer(p.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.toastr.success('Produit supprimé.'); this.charger(); },
        error: () => this.toastr.error('Suppression impossible (produit référencé par des mouvements ?).'),
      });
    });
  }

  estSousSeuil(p: Produit): boolean {
    return (p.quantiteTotale ?? 0) <= p.seuilAlerte;
  }

  trackById(_: number, p: Produit): string {
    return p.id ?? p.code;
  }
}
