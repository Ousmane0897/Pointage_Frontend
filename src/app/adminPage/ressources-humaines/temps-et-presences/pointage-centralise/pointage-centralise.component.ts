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
  ResumeJournee,
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
  selector: 'app-pointage-centralise',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './pointage-centralise.component.html',
  styleUrl: './pointage-centralise.component.scss',
})
export class PointageCentraliseComponent implements OnInit, OnDestroy {

  // ─── Données ─────────────────────────────────────────────────────────────
  pointages: PointageCentralise[] = [];
  resume: ResumeJournee | null = null;
  total = 0;
  totalPages = 0;

  // ─── Pagination ──────────────────────────────────────────────────────────
  page = 0;
  size = 20;

  // ─── Filtres ─────────────────────────────────────────────────────────────
  filtres: FiltrePointage = {
    date: this.today(),
    departement: '',
    site: '',
    statut: undefined,
    q: '',
  };

  // ─── États UI ────────────────────────────────────────────────────────────
  loading = false;
  loadingResume = false;

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
    this.loadResume();
  }

  // ─── Chargement ──────────────────────────────────────────────────────────
  loadPointages(): void {
    this.loading = true;
    const cleanFiltres: FiltrePointage = {
      date: this.filtres.date || undefined,
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

  loadResume(): void {
    if (!this.filtres.date) return;
    this.loadingResume = true;
    this.pointageService
      .getResumeJournee(this.filtres.date)
      .pipe(
        catchError(() => of(null)),
        finalize(() => (this.loadingResume = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(r => (this.resume = r));
  }

  // ─── Filtres ─────────────────────────────────────────────────────────────
  applyFilters(): void {
    this.page = 0;
    this.loadPointages();
    this.loadResume();
  }

  /** Filtrage au clic sur une tuile du résumé. Re-cliquer sur la tuile active revient à « Tous ». */
  filtrerParStatut(statut?: StatutPresence): void {
    this.filtres.statut = this.filtres.statut === statut ? undefined : statut;
    this.page = 0;
    this.loadPointages();
  }

  resetFilters(): void {
    this.filtres = {
      date: this.today(),
      departement: '',
      site: '',
      statut: undefined,
      q: '',
    };
    this.page = 0;
    this.loadPointages();
    this.loadResume();
  }

  // ─── Helpers badges (maps partagées avec l'historique) ───────────────────
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
  goToPage(p: number): void {
    if (p >= 0 && p < this.totalPages) { this.page = p; this.loadPointages(); }
  }
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * `p.id` identifie le créneau et reste stable quand l'agent pointe. Le repli inclut
   * le site : un employé multi-sites produit plusieurs lignes le même jour, que
   * `employeId-date` seul ne distinguerait pas.
   */
  trackById(_: number, p: PointageCentralise): string {
    return p.id ?? `${p.employeId}-${p.date}-${p.site}`;
  }

  private handleError(err: any): void {
    console.error('Erreur pointage centralisé:', err);
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
