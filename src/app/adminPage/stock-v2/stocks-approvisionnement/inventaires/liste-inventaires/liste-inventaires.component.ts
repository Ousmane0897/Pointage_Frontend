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

import { StockV2InventaireService } from '../../../../../services/stock-v2-inventaire.service';
import {
  Inventaire,
  FiltreInventaire,
  StatutInventaire,
} from '../../../../../models/stock-v2-inventaire.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import {
  LIBELLES_STATUT_INVENTAIRE,
  COULEURS_STATUT_INVENTAIRE,
  ORDRE_STATUTS_INVENTAIRE,
  PARAMETRES_STOCK,
} from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-liste-inventaires',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-inventaires.component.html',
  styleUrl: './liste-inventaires.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeInventairesComponent implements OnInit, OnDestroy {

  inventaires: Inventaire[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_STOCK.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreStatut = new FormControl<StatutInventaire | ''>('', { nonNullable: true });

  readonly LIBELLES_STATUT_INVENTAIRE = LIBELLES_STATUT_INVENTAIRE;
  readonly COULEURS_STATUT_INVENTAIRE = COULEURS_STATUT_INVENTAIRE;
  readonly STATUTS = ORDRE_STATUTS_INVENTAIRE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2InventaireService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
    const filtres: FiltreInventaire = {
      q: this.qControl.value?.trim() || undefined,
      statut: this.filtreStatut.value || undefined,
    };
    this.service.lister(this.page, this.size, filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.inventaires = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les inventaires.'),
      });
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  supprimer(inv: Inventaire): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Supprimer l'inventaire « ${inv.libelle} » ?\nCette action est irréversible.`,
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok || !inv.id) return;
      this.service.supprimer(inv.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.toastr.success('Inventaire supprimé.'); this.charger(); },
        error: () => this.toastr.error('Suppression impossible.'),
      });
    });
  }

  trackById(_: number, i: Inventaire): string {
    return i.id ?? i.libelle;
  }
}
