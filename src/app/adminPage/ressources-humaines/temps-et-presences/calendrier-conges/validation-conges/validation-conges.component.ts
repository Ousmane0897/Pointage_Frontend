import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, forkJoin, of, catchError, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../../services/conge.service';
import { CongePermissionsService } from '../../../../../services/conge-permissions.service';
import { WebsocketService } from '../../../../../services/websocket.service';
import {
  CompteursAValider,
  DemandeConge,
  NiveauValidation,
} from '../../../../../models/conge.model';
import {
  LIBELLES_NIVEAU,
  LIBELLES_NIVEAU_COURT,
  LIBELLES_TYPE_CONGE,
  NIVEAU_PAR_STATUT,
  ORDRE_NIVEAUX,
  PARAMETRES_CONGES,
} from '../../../../../constants/conges.constants';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { BadgeStatutCongeComponent } from '../shared/badge-statut-conge.component';
import {
  RefusCongeDialogComponent,
  RefusCongeDialogData,
  RefusCongeDialogResult,
} from '../dialogs/refus-conge-dialog.component';
import {
  ValiderCongeDialogComponent,
  ValiderCongeDialogData,
  ValiderCongeDialogResult,
} from '../dialogs/valider-conge-dialog.component';

/** Onglet actif : un niveau précis, ou la file complète. */
type OngletValidation = NiveauValidation | 'TOUS';

/**
 * File de validation des congés — circuit à 3 niveaux.
 *
 * La liste vient de `GET /demandes/a-valider` : le serveur ne renvoie que ce
 * que l'appelant peut trancher maintenant. Les actions réservées par rôle sont
 * **masquées** (pas grisées), sans quoi la restriction serait contournable en
 * un clic — même parti pris que le Kanban de validation du module Stock.
 */
@Component({
  selector: 'app-validation-conges',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, BadgeStatutCongeComponent],
  templateUrl: './validation-conges.component.html',
  styleUrl: './validation-conges.component.scss',
})
export class ValidationCongesComponent implements OnInit, OnDestroy {

  demandes: DemandeConge[] = [];
  total = 0;
  totalPages = 0;
  page = 0;
  size = PARAMETRES_CONGES.pageSize;
  loading = false;

  ongletActif: OngletValidation = 'TOUS';
  onglets: NiveauValidation[] = [];
  compteurs: CompteursAValider = {
    total: 0,
    parNiveau: { SUPERIEUR: 0, RH: 0, DIRECTION_GENERALE: 0 },
  };

  readonly LIBELLES_TYPE_CONGE = LIBELLES_TYPE_CONGE;
  readonly LIBELLES_NIVEAU_COURT = LIBELLES_NIVEAU_COURT;

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
    this.loading = true;
    forkJoin({
      profil: this.permissions.charger(),
      compteurs: this.congeService.compterAValider().pipe(
        catchError(() => of(this.compteurs)),
      ),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ profil, compteurs }) => {
      this.compteurs = compteurs;
      // Onglets restreints à ce que l'utilisateur peut réellement trancher.
      this.onglets = profil?.niveauxValidables?.length
        ? ORDRE_NIVEAUX.filter(n => profil.niveauxValidables.includes(n))
        : ORDRE_NIVEAUX;
      this.load();
    });

    // Une transition ailleurs dans le circuit peut faire entrer ou sortir une
    // demande de ma file : on recharge plutôt que de patcher la ligne.
    this.websocket.onNotificationsConges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(n => {
        this.toastr.info(n.message, n.titre);
        this.rechargerAvecCompteurs();
      });
  }

  load(): void {
    this.loading = true;
    const niveau = this.ongletActif === 'TOUS' ? undefined : this.ongletActif;
    this.congeService.demandesAValider(this.page, this.size, niveau)
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

  /** Changement d'onglet : on ne recharge que la liste, pas les compteurs. */
  changerOnglet(onglet: OngletValidation): void {
    if (this.ongletActif === onglet) return;
    this.ongletActif = onglet;
    this.page = 0;
    this.load();
  }

  compteurOnglet(onglet: OngletValidation): number {
    return onglet === 'TOUS'
      ? this.compteurs.total
      : (this.compteurs.parNiveau?.[onglet] ?? 0);
  }

  // ─── Décisions ────────────────────────────────────────────────────────────

  valider(d: DemandeConge): void {
    if (!d.id || !this.permissions.peutValiderNiveau(d)) return;
    const niveau = this.niveauDe(d);
    const data: ValiderCongeDialogData = {
      employeNom: this.nomComplet(d),
      periode: this.periode(d),
      nombreJours: d.nombreJours,
      niveau,
      derniereEtape: niveau === 'DIRECTION_GENERALE',
    };

    this.dialog.open(ValiderCongeDialogComponent, { width: '460px', data })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: ValiderCongeDialogResult | null | undefined) => {
        if (!res) return;
        this.congeService.valider(d.id!, res.commentaire).pipe(
          catchError(err => { this.handleError(err); return of(null); }),
          takeUntil(this.destroy$),
        ).subscribe(maj => {
          if (!maj) return;
          this.toastr.success(
            maj.statut === 'APPROUVE'
              ? 'Demande approuvée — le demandeur en est informé.'
              : 'Demande validée — transmise au niveau suivant.',
            'Succès',
          );
          this.rechargerAvecCompteurs();
        });
      });
  }

  refuser(d: DemandeConge): void {
    if (!d.id || !this.permissions.peutValiderNiveau(d)) return;
    const data: RefusCongeDialogData = {
      employeNom: this.nomComplet(d),
      periode: this.periode(d),
      nombreJours: d.nombreJours,
      niveau: this.niveauDe(d),
    };

    this.dialog.open(RefusCongeDialogComponent, { width: '460px', data })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: RefusCongeDialogResult | null | undefined) => {
        if (!res) return;
        this.congeService.refuser(d.id!, res.motif).pipe(
          catchError(err => { this.handleError(err); return of(null); }),
          takeUntil(this.destroy$),
        ).subscribe(maj => {
          if (!maj) return;
          this.toastr.success('Demande refusée — le motif est transmis au demandeur.', 'Succès');
          this.rechargerAvecCompteurs();
        });
      });
  }

  detail(d: DemandeConge): void {
    if (!d.id) return;
    this.router.navigate(['/admin/rh/temps-et-presences/conges/demandes', d.id]);
  }

  retour(): void { this.router.navigate(['/admin/rh/temps-et-presences/conges']); }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  niveauDe(d: DemandeConge): NiveauValidation | undefined {
    return d.niveauCourant ?? NIVEAU_PAR_STATUT[d.statut];
  }

  libelleNiveau(d: DemandeConge): string {
    const n = this.niveauDe(d);
    return n ? LIBELLES_NIVEAU_COURT[n] : '—';
  }

  libelleNiveauLong(n: NiveauValidation): string { return LIBELLES_NIVEAU[n]; }

  nomComplet(d: DemandeConge): string {
    return `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() || d.employeId;
  }

  periode(d: DemandeConge): string {
    return `${this.formatDate(d.dateDebut)} → ${this.formatDate(d.dateFin)}`;
  }

  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.load(); } }

  trackById(_: number, d: DemandeConge): string { return d.id ?? `${d.employeId}-${d.dateDebut}`; }
  trackByNiveau(_: number, n: NiveauValidation): string { return n; }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private rechargerAvecCompteurs(): void {
    this.congeService.compterAValider()
      .pipe(catchError(() => of(this.compteurs)), takeUntil(this.destroy$))
      .subscribe(c => (this.compteurs = c));
    this.load();
  }

  private handleError(err: any): void {
    console.error(err);
    switch (err?.status) {
      case 0:
        this.toastr.error('Serveur injoignable.', 'Erreur réseau');
        break;
      case 403:
        this.toastr.error('Action non autorisée pour votre profil.', 'Accès refusé');
        this.load();
        break;
      case 409:
        this.toastr.warning('Cette demande a déjà été traitée à ce niveau.', 'Conflit');
        this.rechargerAvecCompteurs();
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
