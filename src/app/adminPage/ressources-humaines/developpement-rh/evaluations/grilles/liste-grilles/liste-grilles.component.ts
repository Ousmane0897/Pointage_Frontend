import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { EvaluationService } from '../../../../../../services/evaluation.service';
import {
  GrilleEvaluation,
} from '../../../../../../models/evaluation.model';
import { PageResponse } from '../../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-grilles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-grilles.component.html',
  styleUrl: './liste-grilles.component.scss',
})
export class ListeGrillesComponent implements OnInit, OnDestroy {

  grilles: GrilleEvaluation[] = [];
  total = 0;
  totalPages = 0;

  page = 0;
  size = 10;
  q = '';

  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private evaluationService: EvaluationService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadGrilles();
  }

  loadGrilles(): void {
    this.loading = true;
    this.evaluationService
      .listerGrilles(this.page, this.size, this.q || undefined)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<GrilleEvaluation>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.grilles = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  rechercher(): void { this.page = 0; this.loadGrilles(); }
  resetRecherche(): void { this.q = ''; this.page = 0; this.loadGrilles(); }

  nouvelle(): void {
    this.router.navigate(['/admin/rh/developpement-rh/evaluations/grilles/nouvelle']);
  }

  modifier(g: GrilleEvaluation): void {
    if (!g.id) return;
    this.router.navigate(['/admin/rh/developpement-rh/evaluations/grilles', g.id, 'modifier']);
  }

  supprimer(g: GrilleEvaluation): void {
    if (!g.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Supprimer la grille "${g.titre}" ? Cette action est irréversible.` },
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.evaluationService.supprimerGrille(g.id!).pipe(
        catchError(err => { this.handleError(err); return of(null); }),
        takeUntil(this.destroy$),
      ).subscribe(() => {
        this.toastr.success('Grille supprimée.', 'Succès');
        if (this.grilles.length === 1 && this.page > 0) this.page--;
        this.loadGrilles();
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getStatutClasses(actif: boolean): string {
    return actif
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadGrilles(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadGrilles(); } }

  trackById(_: number, g: GrilleEvaluation): string { return g.id ?? g.titre; }

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
