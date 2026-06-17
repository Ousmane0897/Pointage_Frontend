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
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import { StockV2MouvementService } from '../../../../../services/stock-v2-mouvement.service';
import { StockV2ExportService } from '../../../../../services/stock-v2-export.service';
import {
  MouvementStock,
  FiltreMouvement,
  TypeMouvement,
  MotifMouvement,
} from '../../../../../models/stock-v2-mouvement.model';
import {
  LIBELLES_TYPE_MOUVEMENT,
  COULEURS_TYPE_MOUVEMENT,
  LIBELLES_MOTIF_MOUVEMENT,
  LIBELLES_UNITE,
  PARAMETRES_STOCK,
} from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-liste-mouvements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-mouvements.component.html',
  styleUrl: './liste-mouvements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeMouvementsComponent implements OnInit, OnDestroy {

  mouvements: MouvementStock[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_STOCK.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreType = new FormControl<TypeMouvement | ''>('', { nonNullable: true });
  filtreMotif = new FormControl<MotifMouvement | ''>('', { nonNullable: true });
  dateDebut = new FormControl<string>('', { nonNullable: true });
  dateFin = new FormControl<string>('', { nonNullable: true });

  readonly LIBELLES_TYPE_MOUVEMENT = LIBELLES_TYPE_MOUVEMENT;
  readonly COULEURS_TYPE_MOUVEMENT = COULEURS_TYPE_MOUVEMENT;
  readonly LIBELLES_MOTIF_MOUVEMENT = LIBELLES_MOTIF_MOUVEMENT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly TYPES: TypeMouvement[] = ['ENTREE', 'SORTIE', 'TRANSFERT'];

  private destroy$ = new Subject<void>();

  constructor(
    private mouvementService: StockV2MouvementService,
    private exportService: StockV2ExportService,
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
    const filtres: FiltreMouvement = {
      q: this.qControl.value?.trim() || undefined,
      type: this.filtreType.value || undefined,
      motif: this.filtreMotif.value || undefined,
      dateDebut: this.dateDebut.value || undefined,
      dateFin: this.dateFin.value || undefined,
    };
    this.mouvementService.lister(this.page, this.size, filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.mouvements = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les mouvements.'),
      });
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }

  reinitialiser(): void {
    this.qControl.setValue('', { emitEvent: false });
    this.filtreType.setValue('', { emitEvent: false });
    this.filtreMotif.setValue('', { emitEvent: false });
    this.dateDebut.setValue('', { emitEvent: false });
    this.dateFin.setValue('', { emitEvent: false });
    this.page = 0;
    this.charger();
  }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  exporter(): void {
    if (this.mouvements.length === 0) { this.toastr.info('Aucun mouvement à exporter sur cette page.'); return; }
    this.exportService.exporterMouvements(this.mouvements);
  }

  trackById(_: number, m: MouvementStock): string {
    return m.id ?? `${m.produitId}-${m.date}`;
  }
}
