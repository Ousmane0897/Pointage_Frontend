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

  // ─── Helpers badges ──────────────────────────────────────────────────────
  getStatutClasses(s: StatutPresence): string {
    const map: Record<StatutPresence, string> = {
      PRESENT: 'bg-green-100 text-green-700 border border-green-200',
      ABSENT: 'bg-red-100 text-red-700 border border-red-200',
      RETARD: 'bg-amber-100 text-amber-700 border border-amber-200',
      CONGE: 'bg-blue-100 text-blue-700 border border-blue-200',
    };
    return map[s];
  }

  getStatutLabel(s: StatutPresence): string {
    const map: Record<StatutPresence, string> = {
      PRESENT: 'Présent',
      ABSENT: 'Absent',
      RETARD: 'Retard',
      CONGE: 'En congé',
    };
    return map[s];
  }

  getStatutIcon(s: StatutPresence): string {
    const map: Record<StatutPresence, string> = {
      PRESENT: 'CheckCircle2',
      ABSENT: 'XCircle',
      RETARD: 'AlertTriangle',
      CONGE: 'Plane',
    };
    return map[s];
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

  trackById(_: number, p: PointageCentralise): string {
    return p.id ?? `${p.employeId}-${p.date}`;
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
