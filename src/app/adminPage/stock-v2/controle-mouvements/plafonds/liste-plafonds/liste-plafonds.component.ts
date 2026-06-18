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
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import { StockV2PlafondService } from '../../../../../services/stock-v2-plafond.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import {
  Plafond,
  ConsommationPlafond,
  FiltrePlafond,
  GranularitePlafond,
} from '../../../../../models/stock-v2-plafond.model';
import { SelecteurSiteComponent } from '../../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import {
  LIBELLES_GRANULARITE_PLAFOND,
  LIBELLES_UNITE,
  PARAMETRES_STOCK,
  PARAMETRES_CONTROLE_MOUVEMENTS,
} from '../../../../../constants/stock.constants';

interface PlafondVue {
  plafond: Plafond;
  consomme: number;
  pourcentage: number;
  depassement: boolean;
}

/**
 * Liste des plafonds de dotation — Module Stock v2 / 7.4 (fonctionnalité 7).
 *
 * Affiche chaque plafond avec une jauge consommation vs plafond pour le mois
 * sélectionné. Alerte (toast) en cas de dépassement. CRUD complet.
 */
@Component({
  selector: 'app-liste-plafonds',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, SelecteurSiteComponent],
  templateUrl: './liste-plafonds.component.html',
  styleUrl: './liste-plafonds.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListePlafondsComponent implements OnInit, OnDestroy {

  vues: PlafondVue[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_STOCK.pageSize;
  totalElements = 0;
  totalPages = 0;

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreSiteId = new FormControl<string>('', { nonNullable: true });
  filtreGranularite = new FormControl<GranularitePlafond | ''>('', { nonNullable: true });
  moisControl = new FormControl<string>(this.moisCourant(), { nonNullable: true });

  readonly LIBELLES_GRANULARITE_PLAFOND = LIBELLES_GRANULARITE_PLAFOND;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly SEUIL_ALERTE = PARAMETRES_CONTROLE_MOUVEMENTS.seuilAlertePlafondPct;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2PlafondService,
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
    const filtres: FiltrePlafond = {
      q: this.qControl.value?.trim() || undefined,
      siteId: this.filtreSiteId.value || undefined,
      granularite: this.filtreGranularite.value || undefined,
    };
    const mois = this.moisControl.value;
    forkJoin({
      page: this.service.lister(this.page, this.size, filtres),
      conso: this.service.consommation(mois, this.filtreSiteId.value || undefined),
    })
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: ({ page, conso }) => {
          this.totalElements = page.totalElements;
          this.totalPages = Math.max(1, Math.ceil(page.totalElements / this.size));
          this.vues = this.fusionner(page.content, conso ?? []);
          this.alerterDepassements();
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les plafonds.'),
      });
  }

  private fusionner(plafonds: Plafond[], conso: ConsommationPlafond[]): PlafondVue[] {
    const parId = new Map(conso.map(c => [c.plafondId, c]));
    return plafonds.map(p => {
      const c = p.id ? parId.get(p.id) : undefined;
      const consomme = c?.consomme ?? 0;
      const pourcentage = p.plafondMensuel > 0 ? Math.round((consomme / p.plafondMensuel) * 100) : 0;
      return {
        plafond: p,
        consomme,
        pourcentage,
        depassement: c?.depassement ?? (consomme > p.plafondMensuel),
      };
    });
  }

  private alerterDepassements(): void {
    const nb = this.vues.filter(v => v.depassement).length;
    if (nb > 0) {
      this.toastr.warning(`${nb} plafond(s) dépassé(s) sur le mois sélectionné.`, 'Alerte dotation');
    }
  }

  couleurBarre(v: PlafondVue): string {
    if (v.depassement || v.pourcentage >= PARAMETRES_CONTROLE_MOUVEMENTS.seuilDepassementPlafondPct) return 'bg-red-500';
    if (v.pourcentage >= this.SEUIL_ALERTE) return 'bg-amber-500';
    return 'bg-green-500';
  }

  largeurBarre(v: PlafondVue): string {
    return `${Math.min(100, v.pourcentage)}%`;
  }

  uniteLabel(p: Plafond): string {
    return p.unite ? (LIBELLES_UNITE[p.unite] ?? '') : '';
  }

  appliquerFiltres(): void { this.page = 0; this.charger(); }

  reinitialiser(): void {
    this.qControl.setValue('', { emitEvent: false });
    this.filtreSiteId.setValue('', { emitEvent: false });
    this.filtreGranularite.setValue('', { emitEvent: false });
    this.moisControl.setValue(this.moisCourant(), { emitEvent: false });
    this.page = 0;
    this.charger();
  }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  supprimer(p: Plafond): void {
    if (!p.id) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Supprimer ce plafond (${p.cibleLibelle ?? 'cible'} — ${p.siteNom ?? 'site'}) ?`,
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.service.supprimer(p.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.toastr.success('Plafond supprimé.'); this.charger(); },
        error: () => this.toastr.error('Suppression impossible.'),
      });
    });
  }

  trackById(_: number, v: PlafondVue): string {
    return v.plafond.id ?? `${v.plafond.siteId}-${v.plafond.cibleId}`;
  }

  private moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
