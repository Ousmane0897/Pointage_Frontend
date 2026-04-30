import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { HeureSupplementaireService } from '../../../../../services/heure-supplementaire.service';
import {
  HeureSupplementaire,
  FiltreHS,
  StatutValidationHS,
  TypeMajoration,
  LIBELLES_MAJORATION,
  TAUX_MAJORATION_HS,
} from '../../../../../models/heure-supplementaire.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-heures-sup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-heures-sup.component.html',
  styleUrl: './liste-heures-sup.component.scss',
})
export class ListeHeuresSupComponent implements OnInit, OnDestroy {

  heures: HeureSupplementaire[] = [];
  total = 0;
  totalPages = 0;
  page = 0;
  size = 10;

  filtres: FiltreHS = {
    statut: undefined,
    typeMajoration: undefined,
    departement: '',
    dateDebut: '',
    dateFin: '',
    q: '',
  };

  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private hsService: HeureSupplementaireService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const f: FiltreHS = {
      statut: this.filtres.statut || undefined,
      typeMajoration: this.filtres.typeMajoration || undefined,
      departement: this.filtres.departement || undefined,
      dateDebut: this.filtres.dateDebut || undefined,
      dateFin: this.filtres.dateFin || undefined,
      q: this.filtres.q || undefined,
    };
    this.hsService.lister(this.page, this.size, f).pipe(
      catchError(err => {
        this.handleError(err);
        return of({ content: [], totalElements: 0 } as PageResponse<HeureSupplementaire>);
      }),
      finalize(() => (this.loading = false)),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.heures = res.content;
      this.total = res.totalElements ?? 0;
      this.totalPages = Math.ceil(this.total / this.size);
    });
  }

  applyFilters(): void { this.page = 0; this.load(); }
  resetFilters(): void {
    this.filtres = { statut: undefined, typeMajoration: undefined, departement: '', dateDebut: '', dateFin: '', q: '' };
    this.page = 0;
    this.load();
  }

  declarer(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/heures-supplementaires/declaration']);
  }

  valider(h: HeureSupplementaire): void {
    if (!h.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Valider les ${h.nombreHeures}h sup. de ${h.prenom} ${h.nom} ?` },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.hsService.valider(h.id!).pipe(
        catchError(err => { this.handleError(err); return of(null); }),
        takeUntil(this.destroy$),
      ).subscribe(res => {
        if (!res) return;
        this.toastr.success('HS validées.', 'Succès');
        this.load();
      });
    });
  }

  refuser(h: HeureSupplementaire): void {
    if (!h.id) return;
    const motif = window.prompt('Motif du refus :')?.trim();
    if (!motif) return;
    this.hsService.refuser(h.id, motif).pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      if (!res) return;
      this.toastr.success('HS refusées.', 'Succès');
      this.load();
    });
  }

  supprimer(h: HeureSupplementaire): void {
    if (!h.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Supprimer cette déclaration ? Cette action est irréversible.` },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.hsService.supprimer(h.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success('Déclaration supprimée.', 'Succès');
          this.load();
        },
        error: err => this.handleError(err),
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  getTypeMajorationLabel(t: TypeMajoration): string {
    return LIBELLES_MAJORATION[t] ?? t;
  }
  getTauxMajoration(t: TypeMajoration): number {
    return TAUX_MAJORATION_HS[t];
  }

  getStatutLabel(s: StatutValidationHS): string {
    const m: Record<StatutValidationHS, string> = {
      EN_ATTENTE: 'En attente', VALIDEE: 'Validée', REFUSEE: 'Refusée',
    };
    return m[s];
  }
  getStatutClasses(s: StatutValidationHS): string {
    const m: Record<StatutValidationHS, string> = {
      EN_ATTENTE: 'bg-amber-100 text-amber-700 border border-amber-200',
      VALIDEE: 'bg-green-100 text-green-700 border border-green-200',
      REFUSEE: 'bg-red-100 text-red-700 border border-red-200',
    };
    return m[s];
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.load(); } }

  trackById(_: number, h: HeureSupplementaire): string { return h.id ?? `${h.employeId}-${h.date}-${h.heureDebut}`; }

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
