import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, filter, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../../services/conge.service';
import { CongePermissionsService } from '../../../../../services/conge-permissions.service';
import { WebsocketService } from '../../../../../services/websocket.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import { DemandeConge, NiveauValidation, SoldeConge } from '../../../../../models/conge.model';
import {
  LIBELLES_NIVEAU,
  LIBELLES_TYPE_CONGE,
  NIVEAU_PAR_STATUT,
} from '../../../../../constants/conges.constants';
import { BadgeStatutCongeComponent } from '../shared/badge-statut-conge.component';
import { TimelineValidationCongeComponent } from '../shared/timeline-validation-conge.component';
import {
  RefusCongeDialogComponent,
  RefusCongeDialogResult,
} from '../dialogs/refus-conge-dialog.component';
import {
  ValiderCongeDialogComponent,
  ValiderCongeDialogResult,
} from '../dialogs/valider-conge-dialog.component';

/**
 * Fiche d'une demande de congé : récapitulatif, solde du demandeur, circuit de
 * validation et actions du niveau courant.
 *
 * ⚠ Cette route (`.../conges/demandes/:id`) est **la cible des liens contenus
 * dans les e-mails de notification** envoyés par le backend : la changer casse
 * les liens des mails déjà envoyés.
 */
@Component({
  selector: 'app-detail-demande-conge',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    BadgeStatutCongeComponent,
    TimelineValidationCongeComponent,
  ],
  templateUrl: './detail-demande-conge.component.html',
  styleUrl: './detail-demande-conge.component.scss',
})
export class DetailDemandeCongeComponent implements OnInit, OnDestroy {

  demande: DemandeConge | null = null;
  solde: SoldeConge | null = null;
  loading = false;
  introuvable = false;

  readonly LIBELLES_TYPE_CONGE = LIBELLES_TYPE_CONGE;

  private id!: string;
  private returnUrl: string | null = null;
  private returnTab: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private congeService: CongeService,
    public permissions: CongePermissionsService,
    private websocket: WebsocketService,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    // Écran atteignable depuis l'onglet Congés de la fiche employé : on revient d'où l'on
    // vient (même pattern que `formulaire-contrat` / `avenants`), sinon retour au calendrier.
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.returnTab = this.route.snapshot.queryParamMap.get('tab');
    this.permissions.charger().pipe(takeUntil(this.destroy$)).subscribe();
    this.charger();

    this.websocket.onCongesValidations()
      .pipe(filter(n => n.demandeId === this.id), takeUntil(this.destroy$))
      .subscribe(n => {
        this.toastr.info(n.message, n.titre);
        this.charger();
      });
  }

  charger(): void {
    if (!this.id) { this.introuvable = true; return; }
    this.loading = true;
    this.congeService.getDemandeById(this.id).pipe(
      catchError(err => {
        if (err?.status === 404) this.introuvable = true;
        else this.handleError(err);
        return of(null);
      }),
      finalize(() => (this.loading = false)),
      takeUntil(this.destroy$),
    ).subscribe(d => {
      this.demande = d;
      if (d?.employeId) this.chargerSolde(d.employeId);
    });
  }

  private chargerSolde(employeId: string): void {
    this.congeService.getSoldeEmploye(employeId).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$),
    ).subscribe(s => (this.solde = s));
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  valider(): void {
    const d = this.demande;
    if (!d?.id || !this.permissions.peutValiderNiveau(d)) return;
    const niveau = this.niveauCourant;

    this.dialog.open(ValiderCongeDialogComponent, {
      width: '460px',
      data: {
        employeNom: this.nomComplet,
        periode: this.periode,
        nombreJours: d.nombreJours,
        niveau,
        derniereEtape: niveau === 'DIRECTION_GENERALE',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$))
      .subscribe((res: ValiderCongeDialogResult | null | undefined) => {
        if (!res) return;
        this.congeService.valider(d.id!, res.commentaire).pipe(
          catchError(err => { this.handleError(err); return of(null); }),
          takeUntil(this.destroy$),
        ).subscribe(maj => {
          if (!maj) return;
          this.demande = maj;
          this.toastr.success(
            maj.statut === 'APPROUVE'
              ? 'Demande approuvée.'
              : 'Demande validée — transmise au niveau suivant.',
            'Succès',
          );
        });
      });
  }

  refuser(): void {
    const d = this.demande;
    if (!d?.id || !this.permissions.peutValiderNiveau(d)) return;

    this.dialog.open(RefusCongeDialogComponent, {
      width: '460px',
      data: {
        employeNom: this.nomComplet,
        periode: this.periode,
        nombreJours: d.nombreJours,
        niveau: this.niveauCourant,
      },
    }).afterClosed().pipe(takeUntil(this.destroy$))
      .subscribe((res: RefusCongeDialogResult | null | undefined) => {
        if (!res) return;
        this.congeService.refuser(d.id!, res.motif).pipe(
          catchError(err => { this.handleError(err); return of(null); }),
          takeUntil(this.destroy$),
        ).subscribe(maj => {
          if (!maj) return;
          this.demande = maj;
          this.toastr.success('Demande refusée.', 'Succès');
        });
      });
  }

  annuler(): void {
    const d = this.demande;
    if (!d?.id || !this.permissions.peutAnnuler(d)) return;

    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Annuler la demande de congé de ${this.nomComplet} (${this.periode}) ?`,
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
        this.charger();
      });
    });
  }

  retour(): void {
    if (this.returnUrl) {
      this.router.navigate([this.returnUrl], {
        queryParams: this.returnTab ? { tab: this.returnTab } : {},
      });
      return;
    }
    this.router.navigate(['/admin/rh/temps-et-presences/conges']);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  get niveauCourant(): NiveauValidation | undefined {
    if (!this.demande) return undefined;
    return this.demande.niveauCourant ?? NIVEAU_PAR_STATUT[this.demande.statut];
  }

  get libelleNiveauCourant(): string {
    return this.niveauCourant ? LIBELLES_NIVEAU[this.niveauCourant] : '—';
  }

  get nomComplet(): string {
    const d = this.demande;
    if (!d) return '';
    return `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() || d.employeId;
  }

  get periode(): string {
    const d = this.demande;
    if (!d) return '';
    return `${this.formatDate(d.dateDebut)} → ${this.formatDate(d.dateFin)}`;
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private handleError(err: any): void {
    console.error(err);
    switch (err?.status) {
      case 0:
        this.toastr.error('Serveur injoignable.', 'Erreur réseau');
        break;
      case 403:
        this.toastr.error('Action non autorisée pour votre profil.', 'Accès refusé');
        this.charger();
        break;
      case 409:
        this.toastr.warning('Cette demande a déjà été traitée à ce niveau.', 'Conflit');
        this.charger();
        break;
      case 422:
        this.toastr.error(err?.error?.message ?? 'Demande invalide.', 'Refusé');
        break;
      default:
        this.toastr.error('Une erreur est survenue.', 'Erreur');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
