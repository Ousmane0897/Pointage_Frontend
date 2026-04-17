import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../../services/formation.service';
import { SessionFormation, FiltreSession, StatutSession, Formation, LIBELLES_STATUT_SESSION } from '../../../../../../models/formation.model';
import { PageResponse } from '../../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-sessions.component.html',
  styleUrl: './liste-sessions.component.scss',
})
export class ListeSessionsComponent implements OnInit, OnDestroy {

  sessions: SessionFormation[] = [];
  formations: Formation[] = [];
  total = 0;
  totalPages = 0;
  page = 0;
  size = 10;
  loading = false;

  filtres: FiltreSession = { formationId: '', statut: undefined, dateDebut: '', dateFin: '', q: '' };

  private destroy$ = new Subject<void>();

  constructor(
    private formationService: FormationService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('formationId');
    if (qp) this.filtres.formationId = qp;
    this.loadFormations();
    this.loadSessions();
  }

  private loadFormations(): void {
    this.formationService.lister(0, 200).pipe(
      catchError(() => of({ content: [], totalElements: 0 } as PageResponse<Formation>)),
      takeUntil(this.destroy$),
    ).subscribe(res => (this.formations = res.content));
  }

  loadSessions(): void {
    this.loading = true;
    const f: FiltreSession = {
      formationId: this.filtres.formationId || undefined,
      statut: this.filtres.statut || undefined,
      dateDebut: this.filtres.dateDebut || undefined,
      dateFin: this.filtres.dateFin || undefined,
      q: this.filtres.q || undefined,
    };

    this.formationService.listerSessions(this.page, this.size, f).pipe(
      catchError(err => { this.handleError(err); return of({ content: [], totalElements: 0 } as PageResponse<SessionFormation>); }),
      finalize(() => (this.loading = false)),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.sessions = res.content;
      this.total = res.totalElements ?? 0;
      this.totalPages = Math.ceil(this.total / this.size);
    });
  }

  applyFilters(): void { this.page = 0; this.loadSessions(); }
  resetFilters(): void { this.filtres = { formationId: '', statut: undefined, dateDebut: '', dateFin: '', q: '' }; this.page = 0; this.loadSessions(); }

  nouvelle(): void { this.router.navigate(['/admin/rh/developpement-rh/formations/sessions/nouvelle']); }
  modifier(s: SessionFormation): void { if (s.id) this.router.navigate(['/admin/rh/developpement-rh/formations/sessions', s.id, 'modifier']); }
  participants(s: SessionFormation): void { if (s.id) this.router.navigate(['/admin/rh/developpement-rh/formations/sessions', s.id, 'participants']); }
  evaluation(s: SessionFormation): void { if (s.id) this.router.navigate(['/admin/rh/developpement-rh/formations/sessions', s.id, 'evaluation']); }

  annulerSession(s: SessionFormation): void {
    if (!s.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '420px', data: { message: `Annuler cette session ? Cette action est irréversible.` } });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.formationService.annulerSession(s.id!).pipe(
        catchError(err => { this.handleError(err); return of(null); }),
        takeUntil(this.destroy$),
      ).subscribe(() => { this.toastr.success('Session annulée.', 'Succès'); this.loadSessions(); });
    });
  }

  getStatutLabel(s: StatutSession): string { return LIBELLES_STATUT_SESSION[s] ?? s; }
  getStatutClasses(s: StatutSession): string {
    const map: Record<StatutSession, string> = {
      PLANIFIEE: 'bg-blue-100 text-blue-700 border border-blue-200',
      EN_COURS: 'bg-amber-100 text-amber-700 border border-amber-200',
      TERMINEE: 'bg-green-100 text-green-700 border border-green-200',
      ANNULEE: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return map[s];
  }

  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadSessions(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadSessions(); } }
  trackById(_: number, s: SessionFormation): string { return s.id ?? `${s.formationId}-${s.dateDebut}`; }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
