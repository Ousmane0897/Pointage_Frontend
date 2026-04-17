import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil, forkJoin } from 'rxjs';

import { SanctionService } from '../../../../../services/sanction.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  Sanction,
  FiltreSanction,
  TypeSanction,
  StatutSanction,
  AlerteRecidive,
  LIBELLES_TYPE_SANCTION,
  LIBELLES_STATUT_SANCTION,
} from '../../../../../models/sanction.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-sanctions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-sanctions.component.html',
  styleUrl: './liste-sanctions.component.scss',
})
export class ListeSanctionsComponent implements OnInit, OnDestroy {

  sanctions: Sanction[] = [];
  employes: DossierEmploye[] = [];
  alertes: AlerteRecidive[] = [];
  total = 0;
  totalPages = 0;

  page = 0;
  size = 10;

  filtres: FiltreSanction = {
    employeId: '',
    type: undefined,
    statut: undefined,
    dateDebut: '',
    dateFin: '',
    departement: '',
    q: '',
  };

  departements: string[] = [];
  loading = false;
  showAlertes = true;

  private destroy$ = new Subject<void>();

  constructor(
    private sanctionService: SanctionService,
    private dossierService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadSanctions();
  }

  private loadInitialData(): void {
    forkJoin({
      employes: this.dossierService.getEmployes(0, 200).pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
      ),
      departements: this.dossierService.getDepartements().pipe(
        catchError(() => of([] as string[])),
      ),
      alertes: this.sanctionService.getAlertesRecidive().pipe(
        catchError(() => of([] as AlerteRecidive[])),
      ),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(res => {
      this.employes = res.employes.content;
      this.departements = res.departements;
      this.alertes = res.alertes;
    });
  }

  loadSanctions(): void {
    this.loading = true;
    const f: FiltreSanction = {
      employeId: this.filtres.employeId || undefined,
      type: this.filtres.type || undefined,
      statut: this.filtres.statut || undefined,
      dateDebut: this.filtres.dateDebut || undefined,
      dateFin: this.filtres.dateFin || undefined,
      departement: this.filtres.departement || undefined,
      q: this.filtres.q || undefined,
    };

    this.sanctionService
      .lister(this.page, this.size, f)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<Sanction>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.sanctions = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  applyFilters(): void { this.page = 0; this.loadSanctions(); }
  resetFilters(): void {
    this.filtres = { employeId: '', type: undefined, statut: undefined, dateDebut: '', dateFin: '', departement: '', q: '' };
    this.page = 0;
    this.loadSanctions();
  }

  nouvelle(): void {
    this.router.navigate(['/admin/rh/developpement-rh/sanctions/nouvelle']);
  }

  voirDetail(s: Sanction): void {
    if (!s.id) return;
    this.router.navigate(['/admin/rh/developpement-rh/sanctions', s.id]);
  }

  modifier(s: Sanction): void {
    if (!s.id) return;
    this.router.navigate(['/admin/rh/developpement-rh/sanctions', s.id, 'modifier']);
  }

  supprimer(s: Sanction): void {
    if (!s.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Supprimer cette sanction (${this.getTypeLabel(s.type)}) pour ${s.prenom} ${s.nom} ? Cette action est irréversible.` },
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.sanctionService.supprimer(s.id!).pipe(
        catchError(err => { this.handleError(err); return of(null); }),
        takeUntil(this.destroy$),
      ).subscribe(() => {
        this.toastr.success('Sanction supprimée.', 'Succès');
        if (this.sanctions.length === 1 && this.page > 0) this.page--;
        this.loadSanctions();
      });
    });
  }

  voirHistorique(employeId: string): void {
    this.router.navigate(['/admin/rh/developpement-rh/sanctions/historique', employeId]);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getTypeLabel(t: TypeSanction): string { return LIBELLES_TYPE_SANCTION[t] ?? t; }

  getTypeClasses(t: TypeSanction): string {
    const map: Record<TypeSanction, string> = {
      AVERTISSEMENT: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      BLAME: 'bg-orange-100 text-orange-700 border border-orange-200',
      MISE_A_PIED: 'bg-red-100 text-red-700 border border-red-200',
      LICENCIEMENT: 'bg-red-200 text-red-800 border border-red-300',
    };
    return map[t];
  }

  getStatutLabel(s: StatutSanction): string { return LIBELLES_STATUT_SANCTION[s] ?? s; }

  getStatutClasses(s: StatutSanction): string {
    const map: Record<StatutSanction, string> = {
      CONVOCATION: 'bg-blue-100 text-blue-700 border border-blue-200',
      ENTRETIEN_PLANIFIE: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      NOTIFICATION: 'bg-amber-100 text-amber-700 border border-amber-200',
      EXECUTEE: 'bg-green-100 text-green-700 border border-green-200',
      ANNULEE: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return map[s];
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadSanctions(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadSanctions(); } }

  trackById(_: number, s: Sanction): string { return s.id ?? `${s.employeId}-${s.dateSanction}`; }

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
