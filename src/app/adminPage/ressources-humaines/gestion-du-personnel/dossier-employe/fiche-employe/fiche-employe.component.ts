import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';

import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { ContratService } from '../../../../../services/contrat.service';
import { DocumentEmployeService } from '../../../../../services/document-employe.service';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { Contrat } from '../../../../../models/contrat.model';
import { DocumentEmploye } from '../../../../../models/document-employe.model';

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

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
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
  ) {}

  ngOnInit(): void {
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
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ employe, contrats, documents }) => {
        this.employe = employe;
        this.contrats = contrats;
        this.documents = documents;
      });
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

  navigateToDetailContrat(contratId: string): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/contrats/detail', contratId]);
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
    this.destroy$.next();
    this.destroy$.complete();
  }
}
