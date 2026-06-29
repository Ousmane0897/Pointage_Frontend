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

import { StockV2AnalyseChantierService } from '../../../../../services/stock-v2-analyse-chantier.service';
import {
  Chantier,
  FiltreChantier,
  StatutChantier,
} from '../../../../../models/stock-v2-chantier.model';
import {
  LIBELLES_STATUT_CHANTIER,
  COULEURS_STATUT_CHANTIER,
  ORDRE_STATUTS_CHANTIER,
  PARAMETRES_ANALYSE_CONSO,
  DEVISE,
} from '../../../../../constants/stock.constants';

/**
 * Liste des chantiers — Module Stock v2 / 7.5 (fonctionnalité 2).
 *
 * Vue paginée des chantiers (référence, période, site, coût total, statut) avec
 * recherche et filtre de statut. Le coût total est calculé serveur.
 */
@Component({
  selector: 'app-liste-chantiers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-chantiers.component.html',
  styleUrl: './liste-chantiers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeChantiersComponent implements OnInit, OnDestroy {

  chantiers: Chantier[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_ANALYSE_CONSO.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreStatut = new FormControl<StatutChantier | ''>('', { nonNullable: true });

  readonly LIBELLES_STATUT_CHANTIER = LIBELLES_STATUT_CHANTIER;
  readonly COULEURS_STATUT_CHANTIER = COULEURS_STATUT_CHANTIER;
  readonly STATUTS = ORDRE_STATUTS_CHANTIER;
  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2AnalyseChantierService,
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
    const filtres: FiltreChantier = {
      q: this.qControl.value?.trim() || undefined,
      statut: this.filtreStatut.value || undefined,
    };
    this.service.lister(this.page, this.size, filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.chantiers = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les chantiers.'),
      });
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }

  reinitialiser(): void {
    this.qControl.setValue('', { emitEvent: false });
    this.filtreStatut.setValue('', { emitEvent: false });
    this.page = 0;
    this.charger();
  }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  trackById(_: number, c: Chantier): string {
    return c.id ?? c.reference;
  }
}
