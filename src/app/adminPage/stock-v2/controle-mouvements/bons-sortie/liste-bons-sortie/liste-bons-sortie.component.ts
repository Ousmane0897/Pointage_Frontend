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
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import { StockV2BonSortieService } from '../../../../../services/stock-v2-bon-sortie.service';
import { StockV2ExportService } from '../../../../../services/stock-v2-export.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import {
  BonSortie,
  Destinataire,
  FiltreBonSortie,
  TypeSortie,
} from '../../../../../models/stock-v2-bon-sortie.model';
import { StatutBon } from '../../../../../models/stock-v2-workflow.model';
import {
  LIBELLES_TYPE_SORTIE,
  COULEURS_TYPE_SORTIE,
  ORDRE_TYPES_SORTIE,
  LIBELLES_STATUT_BON,
  COULEURS_STATUT_BON,
  ORDRE_STATUTS_BON,
  PARAMETRES_STOCK,
  DEVISE,
} from '../../../../../constants/stock.constants';

/**
 * Liste des bons de sortie — Module Stock v2 / 7.4 (fonctionnalité 3).
 */
@Component({
  selector: 'app-liste-bons-sortie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-bons-sortie.component.html',
  styleUrl: './liste-bons-sortie.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeBonsSortieComponent implements OnInit, OnDestroy {

  bons: BonSortie[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_STOCK.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreStatut = new FormControl<StatutBon | ''>('', { nonNullable: true });
  filtreType = new FormControl<TypeSortie | ''>('', { nonNullable: true });
  dateDebut = new FormControl<string>('', { nonNullable: true });
  dateFin = new FormControl<string>('', { nonNullable: true });

  readonly LIBELLES_TYPE_SORTIE = LIBELLES_TYPE_SORTIE;
  readonly COULEURS_TYPE_SORTIE = COULEURS_TYPE_SORTIE;
  readonly LIBELLES_STATUT_BON = LIBELLES_STATUT_BON;
  readonly COULEURS_STATUT_BON = COULEURS_STATUT_BON;
  readonly TYPES = ORDRE_TYPES_SORTIE;
  readonly STATUTS = ORDRE_STATUTS_BON;
  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2BonSortieService,
    private exportService: StockV2ExportService,
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
    const filtres: FiltreBonSortie = {
      q: this.qControl.value?.trim() || undefined,
      statut: this.filtreStatut.value || undefined,
      type: this.filtreType.value || undefined,
      dateDebut: this.dateDebut.value || undefined,
      dateFin: this.dateFin.value || undefined,
    };
    this.service.lister(this.page, this.size, filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.bons = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les bons de sortie.'),
      });
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }

  reinitialiser(): void {
    this.qControl.setValue('', { emitEvent: false });
    this.filtreStatut.setValue('', { emitEvent: false });
    this.filtreType.setValue('', { emitEvent: false });
    this.dateDebut.setValue('', { emitEvent: false });
    this.dateFin.setValue('', { emitEvent: false });
    this.page = 0;
    this.charger();
  }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  estBrouillon(b: BonSortie): boolean { return b.statut === 'BROUILLON'; }

  libelleDestinataire(d: Destinataire | undefined): string {
    if (!d) return '—';
    return d.siteNom ?? d.agentNom ?? d.clientNom ?? '—';
  }

  supprimer(b: BonSortie): void {
    if (!b.id || !this.estBrouillon(b)) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Supprimer le bon de sortie « ${b.reference ?? 'brouillon'} » ?\nCette action est irréversible.`,
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.service.supprimer(b.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.toastr.success('Bon supprimé.'); this.charger(); },
        error: () => this.toastr.error('Suppression impossible.'),
      });
    });
  }

  exporter(): void {
    if (this.bons.length === 0) { this.toastr.info('Aucun bon à exporter sur cette page.'); return; }
    this.exportService.exporterBonsSortie(this.bons);
  }

  trackById(_: number, b: BonSortie): string {
    return b.id ?? b.reference ?? `${b.date}`;
  }
}
