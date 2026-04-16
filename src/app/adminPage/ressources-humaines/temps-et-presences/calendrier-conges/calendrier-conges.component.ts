import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../services/conge.service';
import {
  DemandeConge,
  FiltreConge,
  SoldeConge,
  StatutDemande,
  TypeConge,
} from '../../../../models/conge.model';
import { PageResponse } from '../../../../models/pageResponse.model';

@Component({
  selector: 'app-calendrier-conges',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './calendrier-conges.component.html',
  styleUrl: './calendrier-conges.component.scss',
})
export class CalendrierCongesComponent implements OnInit, OnDestroy {

  soldes: SoldeConge[] = [];
  demandes: DemandeConge[] = [];
  total = 0;
  totalPages = 0;

  page = 0;
  size = 10;

  filtres: FiltreConge = {
    statut: undefined,
    type: undefined,
    departement: '',
    dateDebut: '',
    dateFin: '',
    q: '',
  };

  loadingSoldes = false;
  loadingDemandes = false;

  private destroy$ = new Subject<void>();

  constructor(
    private congeService: CongeService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadSoldes();
    this.loadDemandes();
  }

  loadSoldes(): void {
    this.loadingSoldes = true;
    this.congeService.getSoldes()
      .pipe(
        catchError(() => of([] as SoldeConge[])),
        finalize(() => (this.loadingSoldes = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(s => (this.soldes = s));
  }

  loadDemandes(): void {
    this.loadingDemandes = true;
    const f: FiltreConge = {
      statut: this.filtres.statut || undefined,
      type: this.filtres.type || undefined,
      departement: this.filtres.departement || undefined,
      dateDebut: this.filtres.dateDebut || undefined,
      dateFin: this.filtres.dateFin || undefined,
      q: this.filtres.q || undefined,
    };
    this.congeService.listerDemandes(this.page, this.size, f)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<DemandeConge>);
        }),
        finalize(() => (this.loadingDemandes = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.demandes = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  applyFilters(): void { this.page = 0; this.loadDemandes(); }
  resetFilters(): void {
    this.filtres = { statut: undefined, type: undefined, departement: '', dateDebut: '', dateFin: '', q: '' };
    this.page = 0;
    this.loadDemandes();
  }

  nouvelleDemande(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/conges/demande']);
  }

  validation(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/conges/validation']);
  }

  annulerDemande(d: DemandeConge): void {
    if (!d.id) return;
    this.congeService.annulerDemande(d.id).pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.toastr.success('Demande annulée.', 'Succès');
      this.loadDemandes();
      this.loadSoldes();
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  getStatutLabel(s: StatutDemande): string {
    const map: Record<StatutDemande, string> = {
      EN_ATTENTE: 'En attente',
      APPROUVE: 'Approuvée',
      REFUSE: 'Refusée',
      ANNULE: 'Annulée',
    };
    return map[s];
  }

  getStatutClasses(s: StatutDemande): string {
    const map: Record<StatutDemande, string> = {
      EN_ATTENTE: 'bg-amber-100 text-amber-700 border border-amber-200',
      APPROUVE: 'bg-green-100 text-green-700 border border-green-200',
      REFUSE: 'bg-red-100 text-red-700 border border-red-200',
      ANNULE: 'bg-gray-100 text-gray-500 border border-gray-200',
    };
    return map[s];
  }

  getTypeLabel(t: TypeConge): string {
    const map: Record<TypeConge, string> = {
      ANNUEL: 'Annuel',
      MATERNITE: 'Maternité',
      PATERNITE: 'Paternité',
      SANS_SOLDE: 'Sans solde',
      EXCEPTIONNEL: 'Exceptionnel',
    };
    return map[t];
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadDemandes(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadDemandes(); } }

  trackByDemande(_: number, d: DemandeConge): string { return d.id ?? `${d.employeId}-${d.dateDebut}`; }
  trackBySolde(_: number, s: SoldeConge): string { return s.employeId; }

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
