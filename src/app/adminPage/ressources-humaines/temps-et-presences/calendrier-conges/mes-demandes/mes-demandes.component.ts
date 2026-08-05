import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, filter, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../../services/conge.service';
import { CongePermissionsService } from '../../../../../services/conge-permissions.service';
import { WebsocketService } from '../../../../../services/websocket.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import { DemandeConge, SoldeConge } from '../../../../../models/conge.model';
import {
  LIBELLES_NIVEAU_COURT,
  LIBELLES_TYPE_CONGE,
  NIVEAU_PAR_STATUT,
  PARAMETRES_CONGES,
} from '../../../../../constants/conges.constants';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { BadgeStatutCongeComponent } from '../shared/badge-statut-conge.component';

/**
 * Auto-service du collaborateur : ses propres demandes de congé et leur
 * avancement dans le circuit. Le demandeur est déduit du JWT côté serveur
 * (`GET /demandes/mes-demandes`) — aucun filtre employé ici.
 */
@Component({
  selector: 'app-mes-demandes-conge',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, BadgeStatutCongeComponent],
  templateUrl: './mes-demandes.component.html',
  styleUrl: './mes-demandes.component.scss',
})
export class MesDemandesCongeComponent implements OnInit, OnDestroy {

  demandes: DemandeConge[] = [];
  solde: SoldeConge | null = null;
  total = 0;
  totalPages = 0;
  page = 0;
  size = PARAMETRES_CONGES.pageSize;
  loading = false;

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
    this.permissions.charger().pipe(takeUntil(this.destroy$)).subscribe(profil => {
      if (profil?.employeId) this.chargerSolde(profil.employeId);
    });
    this.load();

    // Une décision prise sur l'une de mes demandes doit se voir immédiatement.
    this.websocket.onCongesValidations()
      .pipe(
        filter(n => this.demandes.some(d => d.id === n.demandeId)),
        takeUntil(this.destroy$),
      )
      .subscribe(n => {
        this.toastr.info(n.message, n.titre);
        this.load();
      });
  }

  load(): void {
    this.loading = true;
    this.congeService.mesDemandes(this.page, this.size)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<DemandeConge>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.demandes = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  private chargerSolde(employeId: string): void {
    this.congeService.getSoldeEmploye(employeId).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$),
    ).subscribe(s => (this.solde = s));
  }

  nouvelleDemande(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/conges/demande']);
  }

  detail(d: DemandeConge): void {
    if (!d.id) return;
    this.router.navigate(['/admin/rh/temps-et-presences/conges/demandes', d.id]);
  }

  annuler(d: DemandeConge): void {
    if (!d.id || !this.permissions.peutAnnuler(d)) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Annuler votre demande du ${this.formatDate(d.dateDebut)} au ${this.formatDate(d.dateFin)} ?`,
        confirmLabel: 'Annuler la demande',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.congeService.annulerDemande(d.id!).pipe(
        catchError(err => { this.handleError(err); return of(null as void | null); }),
        takeUntil(this.destroy$),
      ).subscribe(() => {
        this.toastr.success('Demande annulée.', 'Succès');
        this.load();
      });
    });
  }

  retour(): void { this.router.navigate(['/admin/rh/temps-et-presences/conges']); }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  libelleNiveau(d: DemandeConge): string {
    const n = d.niveauCourant ?? NIVEAU_PAR_STATUT[d.statut];
    return n ? LIBELLES_NIVEAU_COURT[n] : '—';
  }

  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.load(); } }

  trackById(_: number, d: DemandeConge): string { return d.id ?? `${d.employeId}-${d.dateDebut}`; }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else if (err?.status === 403) this.toastr.error('Action non autorisée pour votre profil.', 'Accès refusé');
    else if (err?.status === 409) this.toastr.warning('Cette demande a déjà été traitée.', 'Conflit');
    else if (err?.status === 422) this.toastr.error(err?.error?.message ?? 'Demande invalide.', 'Refusé');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
