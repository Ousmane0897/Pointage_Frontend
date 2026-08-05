import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, filter, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../services/conge.service';
import { CongePermissionsService } from '../../../../services/conge-permissions.service';
import { WebsocketService } from '../../../../services/websocket.service';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import {
  DemandeConge,
  FiltreConge,
  SoldeConge,
} from '../../../../models/conge.model';
import {
  LIBELLES_NIVEAU_COURT,
  LIBELLES_STATUT_DEMANDE,
  LIBELLES_TYPE_CONGE,
  NIVEAU_PAR_STATUT,
  ORDRE_STATUTS_DEMANDE,
  ORDRE_TYPES_CONGE,
} from '../../../../constants/conges.constants';
import { PageResponse } from '../../../../models/pageResponse.model';
import { BadgeStatutCongeComponent } from './shared/badge-statut-conge.component';

@Component({
  selector: 'app-calendrier-conges',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
    BadgeStatutCongeComponent,
  ],
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

  readonly ORDRE_STATUTS_DEMANDE = ORDRE_STATUTS_DEMANDE;
  readonly LIBELLES_STATUT_DEMANDE = LIBELLES_STATUT_DEMANDE;
  readonly ORDRE_TYPES_CONGE = ORDRE_TYPES_CONGE;
  readonly LIBELLES_TYPE_CONGE = LIBELLES_TYPE_CONGE;

  private destroy$ = new Subject<void>();

  constructor(
    private congeService: CongeService,
    public permissions: CongePermissionsService,
    private websocket: WebsocketService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.permissions.charger().pipe(takeUntil(this.destroy$)).subscribe();
    this.loadSoldes();
    this.loadDemandes();

    // Une décision prise ailleurs modifie le statut d'une ligne affichée.
    this.websocket.onCongesValidations()
      .pipe(
        filter(n => this.demandes.some(d => d.id === n.demandeId)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.loadDemandes();
        this.loadSoldes();
      });
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

  mesDemandes(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/conges/mes-demandes']);
  }

  detail(d: DemandeConge): void {
    if (!d.id) return;
    this.router.navigate(['/admin/rh/temps-et-presences/conges/demandes', d.id]);
  }

  annulerDemande(d: DemandeConge): void {
    if (!d.id || !this.permissions.peutAnnuler(d)) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Annuler la demande de ${d.prenom} ${d.nom} (${d.nombreJours ?? '?'} j) ?`,
        confirmLabel: 'Annuler la demande',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.congeService.annulerDemande(d.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success('Demande annulée.', 'Succès');
          this.loadDemandes();
          this.loadSoldes();
        },
        error: err => this.handleError(err),
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  /** Niveau attendu pour la demande, ou `—` si elle est sortie du circuit. */
  getNiveauLabel(d: DemandeConge): string {
    const n = d.niveauCourant ?? NIVEAU_PAR_STATUT[d.statut];
    return n ? LIBELLES_NIVEAU_COURT[n] : '—';
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadDemandes(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadDemandes(); } }

  trackByDemande(_: number, d: DemandeConge): string { return d.id ?? `${d.employeId}-${d.dateDebut}`; }
  trackBySolde(_: number, s: SoldeConge): string { return s.employeId; }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else if (err?.status === 403) this.toastr.error('Action non autorisée pour votre profil.', 'Accès refusé');
    else if (err?.status === 409) this.toastr.warning('Cette demande a déjà été traitée.', 'Conflit');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
