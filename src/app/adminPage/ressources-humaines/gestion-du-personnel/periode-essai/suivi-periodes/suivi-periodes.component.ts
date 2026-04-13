import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { PeriodeEssaiService } from '../../../../../services/periode-essai.service';
import { PeriodeEssai, StatutPeriodeEssai } from '../../../../../models/periode-essai.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

@Component({
  selector: 'app-suivi-periodes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './suivi-periodes.component.html',
  styleUrl: './suivi-periodes.component.scss',
})
export class SuiviPeriodesComponent implements OnInit, OnDestroy {

  // ─── Données ──────────────────────────────────────────────────────────────
  periodes: PeriodeEssai[] = [];
  alertes: PeriodeEssai[] = [];
  total = 0;
  totalPages = 0;

  // ─── Pagination ───────────────────────────────────────────────────────────
  page = 0;
  size = 10;

  // ─── Filtre statut ────────────────────────────────────────────────────────
  filtreStatut: StatutPeriodeEssai | '' = '';

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
  alertesDismissed = false;

  // ─── Prolongation modal ───────────────────────────────────────────────────
  showProlongationModal = false;
  selectedPeriode: PeriodeEssai | null = null;
  nouvelleDateFin = '';
  commentaireProlongation = '';
  prolongationLoading = false;

  // ─── Stats cards ──────────────────────────────────────────────────────────
  countEnCours = 0;
  countTitularise = 0;
  countProlonge = 0;
  countNonRenouvele = 0;

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private periodeEssaiService: PeriodeEssaiService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadPeriodesEssai();
    this.getAlertes();
    this.loadStats();
  }

  // ─── Chargement principal ─────────────────────────────────────────────────
  loadPeriodesEssai(): void {
    this.loading = true;

    this.periodeEssaiService
      .getPeriodesEssai(this.page, this.size, this.filtreStatut || undefined)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<PeriodeEssai>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.periodes = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  // ─── Alertes ──────────────────────────────────────────────────────────────
  getAlertes(): void {
    this.periodeEssaiService
      .getAlertes()
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe(alertes => {
        this.alertes = alertes;
      });
  }

  // ─── Stats (chargement de tous les statuts pour comptage) ─────────────────
  private loadStats(): void {
    const statuts: StatutPeriodeEssai[] = ['EN_COURS', 'TITULARISE', 'PROLONGE', 'NON_RENOUVELE'];
    statuts.forEach(statut => {
      this.periodeEssaiService
        .getPeriodesEssai(0, 1, statut)
        .pipe(catchError(() => of({ content: [], totalElements: 0 } as PageResponse<PeriodeEssai>)), takeUntil(this.destroy$))
        .subscribe(res => {
          if (statut === 'EN_COURS') this.countEnCours = res.totalElements ?? 0;
          if (statut === 'TITULARISE') this.countTitularise = res.totalElements ?? 0;
          if (statut === 'PROLONGE') this.countProlonge = res.totalElements ?? 0;
          if (statut === 'NON_RENOUVELE') this.countNonRenouvele = res.totalElements ?? 0;
        });
    });
  }

  // ─── Filtre ───────────────────────────────────────────────────────────────
  applyFilter(): void {
    this.page = 0;
    this.loadPeriodesEssai();
  }

  // ─── Prolongation ─────────────────────────────────────────────────────────
  prolonger(periode: PeriodeEssai): void {
    this.selectedPeriode = periode;
    this.nouvelleDateFin = '';
    this.commentaireProlongation = '';
    this.showProlongationModal = true;
  }

  confirmProlonger(): void {
    if (!this.selectedPeriode?.id || !this.nouvelleDateFin) {
      this.toastr.warning('Veuillez renseigner la nouvelle date de fin.', 'Champs manquants');
      return;
    }

    this.prolongationLoading = true;

    this.periodeEssaiService
      .prolongerPeriodeEssai(this.selectedPeriode.id, this.nouvelleDateFin, this.commentaireProlongation)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
        finalize(() => (this.prolongationLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (res !== null) {
          this.toastr.success('Période d\'essai prolongée avec succès.', 'Succès');
          this.closeProlongationModal();
          this.loadPeriodesEssai();
          this.loadStats();
        }
      });
  }

  closeProlongationModal(): void {
    this.showProlongationModal = false;
    this.selectedPeriode = null;
    this.nouvelleDateFin = '';
    this.commentaireProlongation = '';
  }

  // ─── Demande de validation (titularisation) ───────────────────────────────
  creerDemandeValidation(periode: PeriodeEssai): void {
    if (!periode.id) return;

    this.periodeEssaiService
      .creerDemandeValidation(periode.id, '')
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (res !== null) {
          this.toastr.success(
            `Demande de titularisation créée pour ${periode.employePrenom} ${periode.employeNom}.`,
            'Succès',
          );
          this.loadPeriodesEssai();
        }
      });
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────
  getJoursRestants(dateFin: Date | null): number {
    if (!dateFin) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const fin = new Date(dateFin);
    fin.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  getJoursRestantsClasses(dateFin: Date | null): string {
    const j = this.getJoursRestants(dateFin);
    if (j <= 0) return 'text-red-700 font-semibold';
    if (j <= 7) return 'text-red-600 font-semibold';
    if (j <= 15) return 'text-amber-600 font-semibold';
    return 'text-gray-700';
  }

  getStatutClasses(statut: StatutPeriodeEssai): string {
    const map: Record<StatutPeriodeEssai, string> = {
      EN_COURS: 'bg-blue-100 text-blue-700 border border-blue-200',
      TITULARISE: 'bg-green-100 text-green-700 border border-green-200',
      PROLONGE: 'bg-amber-100 text-amber-700 border border-amber-200',
      NON_RENOUVELE: 'bg-red-100 text-red-700 border border-red-200',
    };
    return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getStatutDotClasses(statut: StatutPeriodeEssai): string {
    const map: Record<StatutPeriodeEssai, string> = {
      EN_COURS: 'bg-blue-500',
      TITULARISE: 'bg-green-500',
      PROLONGE: 'bg-amber-500',
      NON_RENOUVELE: 'bg-red-500',
    };
    return map[statut] ?? 'bg-gray-400';
  }

  getStatutLabel(statut: StatutPeriodeEssai): string {
    const map: Record<StatutPeriodeEssai, string> = {
      EN_COURS: 'En cours',
      TITULARISE: 'Titularisé',
      PROLONGE: 'Prolongé',
      NON_RENOUVELE: 'Non renouvelé',
    };
    return map[statut] ?? statut;
  }

  getAlerteBannerClasses(dateFin: Date | null): string {
    const j = this.getJoursRestants(dateFin);
    if (j <= 7) return 'border-red-300 bg-red-50';
    return 'border-amber-300 bg-amber-50';
  }

  getAlerteIconClasses(dateFin: Date | null): string {
    const j = this.getJoursRestants(dateFin);
    if (j <= 7) return 'text-red-600';
    return 'text-amber-600';
  }

  getAlerteTextClasses(dateFin: Date | null): string {
    const j = this.getJoursRestants(dateFin);
    if (j <= 7) return 'text-red-800';
    return 'text-amber-800';
  }

  dismissAlertes(): void {
    this.alertesDismissed = true;
  }

  // ─── Pagination ───────────────────────────────────────────────────────────
  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadPeriodesEssai();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadPeriodesEssai();
    }
  }

  goToPage(p: number): void {
    if (p >= 0 && p < this.totalPages) {
      this.page = p;
      this.loadPeriodesEssai();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  voirHistorique(periode: PeriodeEssai): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/periode-essai/validation']);
  }

  // ─── Gestion erreurs ──────────────────────────────────────────────────────
  private handleError(err: any): void {
    console.error('Erreur backend :', err);
    let msg = 'Erreur inattendue.';
    if (err.status === 0) msg = 'Impossible de contacter le serveur.';
    else if (err.status === 401) msg = 'Non autorisé. Veuillez vous reconnecter.';
    else if (err.status === 403) msg = "Accès refusé.";
    else if (err.status === 404) msg = 'Ressource introuvable.';
    else if (err.status === 500) msg = 'Erreur interne du serveur.';
    this.toastr.error(msg, 'Erreur');
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
