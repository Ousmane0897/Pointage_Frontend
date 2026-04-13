import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { PeriodeEssaiService } from '../../../../../services/periode-essai.service';
import { DemandeValidation, StatutValidation } from '../../../../../models/periode-essai.model';
import { LoginService } from '../../../../../services/login.service';

@Component({
  selector: 'app-validation-titularisation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './validation-titularisation.component.html',
  styleUrl: './validation-titularisation.component.scss',
})
export class ValidationTitularisationComponent implements OnInit, OnDestroy {

  // ─── Données ──────────────────────────────────────────────────────────────
  demandes: DemandeValidation[] = [];

  // ─── Filtre ───────────────────────────────────────────────────────────────
  filtreStatut: StatutValidation | '' = '';

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;

  // ─── Rôle utilisateur courant ─────────────────────────────────────────────
  currentRole = '';

  // ─── Commentaires de validation par demande ───────────────────────────────
  commentaires: Record<string, string> = {};

  // ─── Validation en cours (par demande) ───────────────────────────────────
  validationLoading: Record<string, boolean> = {};

  // ─── Onglets de filtre ────────────────────────────────────────────────────
  readonly filtres: { label: string; value: StatutValidation | '' }[] = [
    { label: 'Toutes', value: '' },
    { label: 'En attente manager', value: 'EN_ATTENTE_MANAGER' },
    { label: 'Validée manager', value: 'VALIDEE_MANAGER' },
    { label: 'Validée RH', value: 'VALIDEE_RH' },
    { label: 'Confirmée', value: 'CONFIRMEE' },
    { label: 'Refusée', value: 'REFUSEE' },
  ];

  // ─── Étapes du workflow ───────────────────────────────────────────────────
  readonly workflowSteps: { label: string; statuts: StatutValidation[] }[] = [
    { label: 'Demande', statuts: ['EN_ATTENTE_MANAGER'] },
    { label: 'Manager', statuts: ['VALIDEE_MANAGER'] },
    { label: 'RH', statuts: ['VALIDEE_RH'] },
    { label: 'Confirmation', statuts: ['CONFIRMEE', 'REFUSEE'] },
  ];

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private periodeEssaiService: PeriodeEssaiService,
    private toastr: ToastrService,
    private loginService: LoginService,
  ) {}

  ngOnInit(): void {
    this.currentRole = this.loginService.getUserRole();
    this.loadDemandes();
  }

  // ─── Chargement ───────────────────────────────────────────────────────────
  loadDemandes(): void {
    this.loading = true;

    this.periodeEssaiService
      .getDemandesValidation(this.filtreStatut || undefined)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(demandes => {
        this.demandes = demandes;
        // Initialise les commentaires pour chaque demande
        demandes.forEach(d => {
          if (d.id && this.commentaires[d.id] === undefined) {
            this.commentaires[d.id] = '';
          }
        });
      });
  }

  // ─── Filtre ───────────────────────────────────────────────────────────────
  setFiltre(value: StatutValidation | ''): void {
    this.filtreStatut = value;
    this.loadDemandes();
  }

  // ─── Valider / Refuser une demande ────────────────────────────────────────
  valider(
    demande: DemandeValidation,
    decision: 'VALIDEE_MANAGER' | 'VALIDEE_RH' | 'CONFIRMEE' | 'REFUSEE',
  ): void {
    if (!demande.id) return;

    const commentaire = this.commentaires[demande.id] ?? '';
    this.validationLoading[demande.id] = true;

    this.periodeEssaiService
      .validerDemande(demande.id, decision, commentaire)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
        finalize(() => {
          if (demande.id) this.validationLoading[demande.id] = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (res !== null) {
          const decisionLabel = this.getStatutLabel(decision as StatutValidation);
          this.toastr.success(
            `Demande de ${demande.employePrenom} ${demande.employeNom} : ${decisionLabel}.`,
            'Succès',
          );
          this.loadDemandes();
        }
      });
  }

  // ─── Autorisation de validation selon le rôle ────────────────────────────
  canValidate(demande: DemandeValidation): boolean {
    const role = this.currentRole.toUpperCase();
    if (demande.statut === 'EN_ATTENTE_MANAGER') {
      return role === 'MANAGER' || role === 'ADMIN' || role === 'SUPERADMIN';
    }
    if (demande.statut === 'VALIDEE_MANAGER') {
      return role === 'RH' || role === 'ADMIN' || role === 'SUPERADMIN';
    }
    if (demande.statut === 'VALIDEE_RH') {
      return role === 'ADMIN' || role === 'SUPERADMIN' || role === 'DIRECTION';
    }
    return false;
  }

  getNextDecision(demande: DemandeValidation): 'VALIDEE_MANAGER' | 'VALIDEE_RH' | 'CONFIRMEE' | null {
    if (demande.statut === 'EN_ATTENTE_MANAGER') return 'VALIDEE_MANAGER';
    if (demande.statut === 'VALIDEE_MANAGER') return 'VALIDEE_RH';
    if (demande.statut === 'VALIDEE_RH') return 'CONFIRMEE';
    return null;
  }

  // ─── Étape courante dans le workflow (0-based index) ─────────────────────
  getWorkflowStep(statut: StatutValidation): number {
    if (statut === 'EN_ATTENTE_MANAGER') return 0;
    if (statut === 'VALIDEE_MANAGER') return 1;
    if (statut === 'VALIDEE_RH') return 2;
    if (statut === 'CONFIRMEE' || statut === 'REFUSEE') return 3;
    return 0;
  }

  isStepDone(stepIndex: number, statut: StatutValidation): boolean {
    return this.getWorkflowStep(statut) > stepIndex;
  }

  isStepActive(stepIndex: number, statut: StatutValidation): boolean {
    return this.getWorkflowStep(statut) === stepIndex;
  }

  // ─── Libellés et classes ──────────────────────────────────────────────────
  getStatutLabel(statut: StatutValidation): string {
    const map: Record<StatutValidation, string> = {
      EN_ATTENTE_MANAGER: 'En attente manager',
      VALIDEE_MANAGER: 'Validée par le manager',
      VALIDEE_RH: 'Validée par les RH',
      CONFIRMEE: 'Confirmée',
      REFUSEE: 'Refusée',
    };
    return map[statut] ?? statut;
  }

  getStatutClasses(statut: StatutValidation): string {
    const map: Record<StatutValidation, string> = {
      EN_ATTENTE_MANAGER: 'bg-amber-100 text-amber-700 border border-amber-200',
      VALIDEE_MANAGER: 'bg-blue-100 text-blue-700 border border-blue-200',
      VALIDEE_RH: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      CONFIRMEE: 'bg-green-100 text-green-700 border border-green-200',
      REFUSEE: 'bg-red-100 text-red-700 border border-red-200',
    };
    return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getStatutDotClasses(statut: StatutValidation): string {
    const map: Record<StatutValidation, string> = {
      EN_ATTENTE_MANAGER: 'bg-amber-500',
      VALIDEE_MANAGER: 'bg-blue-500',
      VALIDEE_RH: 'bg-indigo-500',
      CONFIRMEE: 'bg-green-500',
      REFUSEE: 'bg-red-500',
    };
    return map[statut] ?? 'bg-gray-400';
  }

  getStepCircleClasses(stepIndex: number, statut: StatutValidation): string {
    const isRefused = statut === 'REFUSEE' && stepIndex === 3;
    if (isRefused) return 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-red-100 text-red-600 border-2 border-red-400';
    if (this.isStepDone(stepIndex, statut)) return 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-green-500 text-white border-2 border-green-500';
    if (this.isStepActive(stepIndex, statut)) return 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-600 text-white border-2 border-indigo-600';
    return 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-400 border-2 border-gray-200';
  }

  getStepLabelClasses(stepIndex: number, statut: StatutValidation): string {
    if (this.isStepDone(stepIndex, statut)) return 'text-xs text-green-600 font-medium mt-1 text-center';
    if (this.isStepActive(stepIndex, statut)) return 'text-xs text-indigo-700 font-semibold mt-1 text-center';
    return 'text-xs text-gray-400 mt-1 text-center';
  }

  getConnectorClasses(stepIndex: number, statut: StatutValidation): string {
    if (this.isStepDone(stepIndex, statut)) return 'flex-1 h-0.5 bg-green-400 mx-1';
    return 'flex-1 h-0.5 bg-gray-200 mx-1';
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
