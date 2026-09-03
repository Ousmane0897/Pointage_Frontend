import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { PointageCentraliseService } from '../../../../services/pointage-centralise.service';
import {
  PointageCentralise,
  FiltrePointage,
  StatutPresence,
} from '../../../../models/pointage-centralise.model';
import { PageResponse } from '../../../../models/pageResponse.model';
import {
  TOLERANCE_RETARD_MINUTES,
  CLASSES_STATUT,
  LIBELLES_STATUT,
  ICONES_STATUT,
  DESCRIPTIONS_STATUT,
  estEnRetard,
  estNeutre,
  horairePrevu,
  statutAffiche,
} from '../pointage-retard.util';

@Component({
  selector: 'app-historique-pointage-centralise',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './historique-pointage-centralise.component.html',
  styleUrl: './historique-pointage-centralise.component.scss',
})
export class HistoriquePointageCentraliseComponent implements OnInit, OnDestroy {

  // ─── Données ─────────────────────────────────────────────────────────────
  pointages: PointageCentralise[] = [];
  total = 0;
  totalPages = 0;

  // ─── Pagination ──────────────────────────────────────────────────────────
  page = 0;
  size = 20;

  // ─── Filtres ─────────────────────────────────────────────────────────────
  filtres: FiltrePointage = {
    dateDebut: this.firstDayOfMonth(),
    dateFin: this.today(),
    departement: '',
    site: '',
    statut: undefined,
    q: '',
  };

  // ─── États UI ────────────────────────────────────────────────────────────
  loading = false;

  // ─── Statuts : le serveur fait autorité, le front ne dérive rien ─────────
  protected readonly TOLERANCE_RETARD_MINUTES = TOLERANCE_RETARD_MINUTES;
  protected readonly estEnRetard = estEnRetard;
  protected readonly estNeutre = estNeutre;
  protected readonly horairePrevu = horairePrevu;
  protected readonly statutAffiche = statutAffiche;

  private destroy$ = new Subject<void>();

  constructor(
    private pointageService: PointageCentraliseService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadPointages();
  }

  // ─── Chargement ──────────────────────────────────────────────────────────
  loadPointages(): void {
    this.loading = true;
    const cleanFiltres: FiltrePointage = {
      dateDebut: this.filtres.dateDebut || undefined,
      dateFin: this.filtres.dateFin || undefined,
      departement: this.filtres.departement || undefined,
      site: this.filtres.site || undefined,
      statut: this.filtres.statut || undefined,
      q: this.filtres.q || undefined,
    };

    this.pointageService
      .listerPointages(this.page, this.size, cleanFiltres)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<PointageCentralise>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.pointages = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  // ─── Filtres ─────────────────────────────────────────────────────────────
  applyFilters(): void {
    this.page = 0;
    this.loadPointages();
  }

  resetFilters(): void {
    this.filtres = {
      dateDebut: this.firstDayOfMonth(),
      dateFin: this.today(),
      departement: '',
      site: '',
      statut: undefined,
      q: '',
    };
    this.page = 0;
    this.loadPointages();
  }

  // ─── Helpers badges ──────────────────────────────────────────────────────
  getStatutClasses(s: StatutPresence): string {
    return CLASSES_STATUT[s];
  }

  getStatutLabel(s: StatutPresence): string {
    return LIBELLES_STATUT[s];
  }

  getStatutIcon(s: StatutPresence): string {
    return ICONES_STATUT[s];
  }

  getStatutDescription(s: StatutPresence): string {
    return DESCRIPTIONS_STATUT[s];
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void {
    if (this.page + 1 < this.totalPages) { this.page++; this.loadPointages(); }
  }
  prevPage(): void {
    if (this.page > 0) { this.page--; this.loadPointages(); }
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private firstDayOfMonth(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }

  /** Voir la vue du jour : le repli inclut le site, une ligne = un créneau. */
  trackById(_: number, p: PointageCentralise): string {
    return p.id ?? `${p.employeId}-${p.date}-${p.site}`;
  }

  private handleError(err: any): void {
    console.error('Erreur historique pointage centralisé:', err);
    if (err?.status === 0) {
      this.toastr.error('Impossible de contacter le serveur.', 'Erreur réseau');
    } else if (err?.status === 403) {
      this.toastr.error("Accès refusé.", 'Erreur');
    } else {
      this.toastr.error('Une erreur est survenue.', 'Erreur');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
