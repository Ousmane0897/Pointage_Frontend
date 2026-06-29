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

import { StockV2CoutChantierService } from '../../../../../services/stock-v2-cout-chantier.service';
import { ChantierValorise, FiltreCoutChantier } from '../../../../../models/stock-v2-cout-chantier.model';
import { StatutChantier } from '../../../../../models/stock-v2-chantier.model';
import {
  LIBELLES_STATUT_CHANTIER,
  COULEURS_STATUT_CHANTIER,
  ORDRE_STATUTS_CHANTIER,
  DEVISE,
} from '../../../../../constants/stock.constants';
import { PARAMETRES_VALORISATION } from '../../../../../constants/stock-v2-valorisation.constants';

/**
 * Liste des chantiers valorisés (coût de revient) — Module Stock v2 / 7.6 (fonctionnalité 5).
 */
@Component({
  selector: 'app-liste-cout-chantiers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-cout-chantiers.component.html',
  styleUrl: './liste-cout-chantiers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeCoutChantiersComponent implements OnInit, OnDestroy {

  chantiers: ChantierValorise[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_VALORISATION.pageSize;
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
    private service: StockV2CoutChantierService,
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
    const filtres: FiltreCoutChantier = {
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
        error: () => this.toastr.error('Impossible de charger les chantiers valorisés.'),
      });
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }
  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  trackById(_: number, c: ChantierValorise): string { return c.id; }
}
