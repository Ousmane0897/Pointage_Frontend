import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, forkJoin, takeUntil } from 'rxjs';

import { EvaluationService } from '../../../../../services/evaluation.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  EvaluationPeriodique,
  FiltreEvaluation,
  StatutEvaluation,
  LIBELLES_STATUT_EVALUATION,
} from '../../../../../models/evaluation.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

@Component({
  selector: 'app-liste-evaluations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-evaluations.component.html',
  styleUrl: './liste-evaluations.component.scss',
})
export class ListeEvaluationsComponent implements OnInit, OnDestroy {

  evaluations: EvaluationPeriodique[] = [];
  total = 0;
  totalPages = 0;

  page = 0;
  size = 10;

  filtres: FiltreEvaluation = {
    departement: '',
    periode: '',
    statut: undefined,
    q: '',
  };

  departements: string[] = [];
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private evaluationService: EvaluationService,
    private dossierService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadEvaluations();
  }

  private loadInitialData(): void {
    this.dossierService.getDepartements()
      .pipe(
        catchError(() => of([] as string[])),
        takeUntil(this.destroy$),
      )
      .subscribe(deps => (this.departements = deps));
  }

  loadEvaluations(): void {
    this.loading = true;
    const f: FiltreEvaluation = {
      departement: this.filtres.departement || undefined,
      periode: this.filtres.periode || undefined,
      statut: this.filtres.statut || undefined,
      q: this.filtres.q || undefined,
    };

    this.evaluationService
      .listerEvaluations(this.page, this.size, f)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<EvaluationPeriodique>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.evaluations = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  applyFilters(): void { this.page = 0; this.loadEvaluations(); }
  resetFilters(): void {
    this.filtres = { departement: '', periode: '', statut: undefined, q: '' };
    this.page = 0;
    this.loadEvaluations();
  }

  nouvelle(): void {
    this.router.navigate(['/admin/rh/developpement-rh/evaluations/nouvelle']);
  }

  voir(e: EvaluationPeriodique): void {
    if (!e.id) return;
    this.router.navigate(['/admin/rh/developpement-rh/evaluations', e.id]);
  }

  voirHistorique(employeId: string): void {
    this.router.navigate(['/admin/rh/developpement-rh/evaluations/historique', employeId]);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getStatutLabel(s: StatutEvaluation): string {
    return LIBELLES_STATUT_EVALUATION[s] ?? s;
  }

  getStatutClasses(s: StatutEvaluation): string {
    const map: Record<StatutEvaluation, string> = {
      BROUILLON: 'bg-gray-100 text-gray-600 border border-gray-200',
      AUTO_EVALUATION: 'bg-blue-100 text-blue-700 border border-blue-200',
      EVALUATION_MANAGER: 'bg-amber-100 text-amber-700 border border-amber-200',
      VALIDE: 'bg-green-100 text-green-700 border border-green-200',
    };
    return map[s];
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadEvaluations(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadEvaluations(); } }

  trackById(_: number, e: EvaluationPeriodique): string { return e.id ?? `${e.employeId}-${e.periode}`; }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
