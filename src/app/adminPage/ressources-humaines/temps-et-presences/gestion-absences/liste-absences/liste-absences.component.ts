import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { AbsenceService } from '../../../../../services/absence.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  Absence,
  FiltreAbsence,
  TypeAbsence,
  StatutAbsence,
} from '../../../../../models/absence.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-absences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-absences.component.html',
  styleUrl: './liste-absences.component.scss',
})
export class ListeAbsencesComponent implements OnInit, OnDestroy {

  absences: Absence[] = [];
  employes: DossierEmploye[] = [];
  total = 0;
  totalPages = 0;

  page = 0;
  size = 10;

  filtres: FiltreAbsence = {
    employeId: '',
    type: undefined,
    statut: undefined,
    dateDebut: '',
    dateFin: '',
    q: '',
  };

  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private absenceService: AbsenceService,
    private dossierService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadEmployes();
    this.loadAbsences();
  }

  private loadEmployes(): void {
    this.dossierService
      .getEmployes(0, 200)
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => (this.employes = res.content));
  }

  loadAbsences(): void {
    this.loading = true;
    const f: FiltreAbsence = {
      employeId: this.filtres.employeId || undefined,
      type: this.filtres.type || undefined,
      statut: this.filtres.statut || undefined,
      dateDebut: this.filtres.dateDebut || undefined,
      dateFin: this.filtres.dateFin || undefined,
      q: this.filtres.q || undefined,
    };

    this.absenceService
      .lister(this.page, this.size, f)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<Absence>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.absences = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  applyFilters(): void { this.page = 0; this.loadAbsences(); }
  resetFilters(): void {
    this.filtres = { employeId: '', type: undefined, statut: undefined, dateDebut: '', dateFin: '', q: '' };
    this.page = 0;
    this.loadAbsences();
  }

  nouvelle(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/absences/nouvelle']);
  }

  modifier(a: Absence): void {
    if (!a.id) return;
    this.router.navigate(['/admin/rh/temps-et-presences/absences', a.id, 'modifier']);
  }

  supprimer(a: Absence): void {
    if (!a.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Supprimer cette absence (${this.getTypeLabel(a.type)}) ? Cette action est irréversible.` },
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.absenceService.supprimer(a.id!).pipe(
        catchError(err => { this.handleError(err); return of(null); }),
        takeUntil(this.destroy$),
      ).subscribe(() => {
        this.toastr.success('Absence supprimée.', 'Succès');
        if (this.absences.length === 1 && this.page > 0) this.page--;
        this.loadAbsences();
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  getTypeLabel(t: TypeAbsence): string {
    const map: Record<TypeAbsence, string> = {
      CONGE_PAYE: 'Congé payé',
      MALADIE: 'Maladie',
      PERMISSION: 'Permission',
      INJUSTIFIEE: 'Injustifiée',
      AUTRE: 'Autre',
    };
    return map[t] ?? t;
  }

  getTypeClasses(t: TypeAbsence): string {
    const map: Record<TypeAbsence, string> = {
      CONGE_PAYE: 'bg-blue-100 text-blue-700 border border-blue-200',
      MALADIE: 'bg-purple-100 text-purple-700 border border-purple-200',
      PERMISSION: 'bg-green-100 text-green-700 border border-green-200',
      INJUSTIFIEE: 'bg-red-100 text-red-700 border border-red-200',
      AUTRE: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return map[t];
  }

  getStatutLabel(s?: StatutAbsence): string {
    if (!s) return '—';
    const map: Record<StatutAbsence, string> = {
      DECLAREE: 'Déclarée',
      JUSTIFIEE: 'Justifiée',
      REFUSEE: 'Refusée',
    };
    return map[s];
  }

  getStatutClasses(s?: StatutAbsence): string {
    if (!s) return 'bg-gray-100 text-gray-500';
    const map: Record<StatutAbsence, string> = {
      DECLAREE: 'bg-amber-100 text-amber-700 border border-amber-200',
      JUSTIFIEE: 'bg-green-100 text-green-700 border border-green-200',
      REFUSEE: 'bg-red-100 text-red-700 border border-red-200',
    };
    return map[s];
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadAbsences(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadAbsences(); } }

  trackById(_: number, a: Absence): string { return a.id ?? `${a.employeId}-${a.dateDebut}`; }

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
