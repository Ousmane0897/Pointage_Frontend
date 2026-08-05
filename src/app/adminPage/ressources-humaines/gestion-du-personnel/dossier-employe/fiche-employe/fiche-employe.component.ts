import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';

import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { ContratService } from '../../../../../services/contrat.service';
import { DocumentEmployeService } from '../../../../../services/document-employe.service';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { Contrat, AlerteContrat } from '../../../../../models/contrat.model';
import { DocumentEmploye } from '../../../../../models/document-employe.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

export type ActiveTab = 'infos' | 'contrats' | 'documents';

@Component({
  selector: 'app-fiche-employe',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './fiche-employe.component.html',
  styleUrl: './fiche-employe.component.scss',
})
export class FicheEmployeComponent implements OnInit, OnDestroy {

  // ─── Données ──────────────────────────────────────────────────────────────
  employe: DossierEmploye | null = null;
  contrats: Contrat[] = [];
  documents: DocumentEmploye[] = [];

  /** Alertes d'échéance de contrat, filtrées sur cet employé. */
  alertesContrats: AlerteContrat[] = [];
  alertesDismissed = false;

  // ─── Photo (ObjectURL local, le endpoint est protégé par JWT) ────────────
  photoBlobUrl: string | null = null;

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
  contratsLoading = false;
  errorMessage = '';
  activeTab: ActiveTab = 'infos';

  // ─── Identifiant de l'employé ─────────────────────────────────────────────
  private employeId = '';

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dossierEmployeService: DossierEmployeService,
    private contratService: ContratService,
    private documentEmployeService: DocumentEmployeService,
    private dialog: MatDialog,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    // Onglet actif restauré au retour du formulaire de contrat (?tab=contrats)
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(qp => {
        const tab = qp.get('tab');
        if (tab === 'infos' || tab === 'contrats' || tab === 'documents') {
          this.activeTab = tab;
        }
      });

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.employeId = params['id'] ?? '';
        if (this.employeId) {
          this.chargerDonnees();
        } else {
          this.errorMessage = "Identifiant de l'employé manquant.";
        }
      });
  }

  // ─── Chargement des données ───────────────────────────────────────────────
  private chargerDonnees(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      employe: this.dossierEmployeService.getEmployeById(this.employeId).pipe(
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
      ),
      contrats: this.contratService.getContratsByEmploye(this.employeId).pipe(
        catchError(() => of([])),
      ),
      documents: this.documentEmployeService.getDocumentsByEmploye(this.employeId).pipe(
        catchError(() => of([])),
      ),
      // Un 403 sur les alertes ne doit pas empêcher l'affichage de la fiche.
      alertes: this.contratService.getAlertes().pipe(
        catchError(() => of([] as AlerteContrat[])),
      ),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ employe, contrats, documents, alertes }) => {
        this.employe = employe;
        this.contrats = contrats;
        this.documents = documents;
        this.alertesContrats = alertes.filter(a => a.employeId === this.employeId);
        this.chargerPhoto();
      });
  }

  /**
   * Recharge uniquement les contrats et leurs alertes (après suppression).
   * On évite `chargerDonnees()` qui relancerait aussi le blob de la photo.
   */
  private rechargerContrats(): void {
    this.contratsLoading = true;

    forkJoin({
      contrats: this.contratService.getContratsByEmploye(this.employeId).pipe(
        catchError(() => of([] as Contrat[])),
      ),
      alertes: this.contratService.getAlertes().pipe(
        catchError(() => of([] as AlerteContrat[])),
      ),
    })
      .pipe(
        finalize(() => (this.contratsLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ contrats, alertes }) => {
        this.contrats = contrats;
        this.alertesContrats = alertes.filter(a => a.employeId === this.employeId);
      });
  }

  // ─── Chargement de la photo (endpoint protégé par JWT) ───────────────────
  private chargerPhoto(): void {
    this.revoquerPhotoBlobUrl();
    if (!this.employe?.id || !this.employe.photoUrl) return;

    this.dossierEmployeService
      .getPhotoBlob(this.employe.id)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(blob => {
        if (blob) {
          this.photoBlobUrl = URL.createObjectURL(blob);
        }
      });
  }

  private revoquerPhotoBlobUrl(): void {
    if (this.photoBlobUrl) {
      URL.revokeObjectURL(this.photoBlobUrl);
      this.photoBlobUrl = null;
    }
  }

  // ─── Navigation par onglets ───────────────────────────────────────────────
  setActiveTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  navigateToModification(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/dossier-employe/modifier', this.employeId]);
  }

  navigateToContrats(): void {
    this.activeTab = 'contrats';
  }

  // ─── Contrats : navigation vers les écrans dédiés ────────────────────────
  /** URL de retour passée aux écrans contrat pour revenir ici, onglet Contrats. */
  private get returnUrl(): string {
    return `/admin/rh/gestion-du-personnel/dossier-employe/fiche/${this.employeId}?tab=contrats`;
  }

  navigateToNouveauContrat(): void {
    this.router.navigate(
      ['/admin/rh/gestion-du-personnel/contrats/nouveau', this.employeId],
      { queryParams: { returnUrl: this.returnUrl } },
    );
  }

  navigateToModificationContrat(contratId: string): void {
    this.router.navigate(
      ['/admin/rh/gestion-du-personnel/contrats', contratId, 'modifier'],
      { queryParams: { returnUrl: this.returnUrl } },
    );
  }

  navigateToAvenants(contratId: string): void {
    this.router.navigate(
      ['/admin/rh/gestion-du-personnel/contrats', contratId, 'avenants'],
      { queryParams: { returnUrl: this.returnUrl } },
    );
  }

  // ─── Contrats : suppression ───────────────────────────────────────────────
  supprimerContrat(contrat: Contrat): void {
    const nomComplet = `${this.employe?.prenom ?? ''} ${this.employe?.nom ?? ''}`.trim();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Êtes-vous sûr de vouloir supprimer le contrat ${contrat.typeContrat} de ${nomComplet} ? Cette action est irréversible.`,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.contratService
          .supprimerContrat(contrat.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Contrat supprimé avec succès.', 'Succès');
              this.rechargerContrats();
            },
            error: err => {
              console.error('Erreur suppression contrat :', err);
              this.toastr.error('Erreur lors de la suppression du contrat.', 'Erreur');
            },
          });
      });
  }

  // ─── Contrats : téléchargement du fichier (endpoint protégé par JWT) ─────
  telechargerFichierContrat(contrat: Contrat): void {
    if (!contrat.id) return;

    this.contratService
      .telechargerContrat(contrat.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const lien = document.createElement('a');
          lien.href = url;
          lien.download = contrat.fichierContratNom ?? 'contrat';
          lien.click();
          URL.revokeObjectURL(url);
        },
        error: err => {
          console.error('Erreur téléchargement contrat :', err);
          this.toastr.error('Impossible de télécharger le fichier du contrat.', 'Erreur');
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/dossier-employe']);
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────
  getInitiales(): string {
    if (!this.employe) return '';
    const p = this.employe.prenom?.charAt(0) ?? '';
    const n = this.employe.nom?.charAt(0) ?? '';
    return (p + n).toUpperCase();
  }

  getLibelleStatut(statut: string): string {
    switch (statut) {
      case 'ACTIF':            return 'Actif';
      case 'EN_PERIODE_ESSAI': return "Période d'essai";
      case 'SUSPENDU':         return 'Suspendu';
      case 'SORTI':            return 'Sorti';
      default:                 return statut;
    }
  }

  getLibelleStatutContrat(statut: string): string {
    switch (statut) {
      case 'ACTIF':      return 'Actif';
      case 'EXPIRE':     return 'Expiré';
      case 'RENOUVELE':  return 'Renouvelé';
      case 'RESILIE':    return 'Résilié';
      default:           return statut;
    }
  }

  getTypeContratBadgeClasses(type: string): string {
    const map: Record<string, string> = {
      CDI:        'bg-blue-100 text-blue-700 border border-blue-200',
      CDD:        'bg-amber-100 text-amber-700 border border-amber-200',
      STAGE:      'bg-purple-100 text-purple-700 border border-purple-200',
      PRESTATION: 'bg-teal-100 text-teal-700 border border-teal-200',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getAlerteBadgeColor(joursRestants: number): string {
    if (joursRestants <= 7)  return 'text-red-700';
    if (joursRestants <= 30) return 'text-amber-700';
    return 'text-yellow-700';
  }

  dismissAlertes(): void {
    this.alertesDismissed = true;
  }

  getLibelleStatutDocument(statut: string): string {
    switch (statut) {
      case 'VALIDE':     return 'Validé';
      case 'EN_ATTENTE': return 'En attente';
      case 'REFUSE':     return 'Refusé';
      case 'EXPIRE':     return 'Expiré';
      default:           return statut;
    }
  }

  getLibelleCategorie(categorie: string): string {
    switch (categorie) {
      case 'CNI':         return "Carte d'identité";
      case 'DIPLOME':     return 'Diplôme';
      case 'CERTIFICAT':  return 'Certificat';
      case 'ATTESTATION': return 'Attestation';
      case 'CONTRAT':     return 'Contrat';
      case 'AUTRE':       return 'Autre';
      default:            return categorie;
    }
  }

  getGenreLibelle(genre: string): string {
    return genre === 'HOMME' ? 'Homme' : 'Femme';
  }

  trackById(_: number, item: { id?: string }): string {
    return item.id ?? '';
  }

  // ─── Gestion des erreurs HTTP ─────────────────────────────────────────────
  private handleError(err: any): void {
    console.error('Erreur chargement fiche employé :', err);
    if (err.status === 0) {
      this.errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    } else if (err.status === 401) {
      this.errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
    } else if (err.status === 403) {
      this.errorMessage = "Accès refusé. Vous n'avez pas les droits nécessaires.";
    } else if (err.status === 404) {
      this.errorMessage = 'Dossier employé introuvable.';
    } else if (err.status === 500) {
      this.errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
    } else {
      this.errorMessage = `Erreur inattendue (${err.status}).`;
    }
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.revoquerPhotoBlobUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
