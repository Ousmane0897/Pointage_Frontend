import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../../services/conge.service';
import { CongePermissionsService } from '../../../../../services/conge-permissions.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  CreationDemandePayload,
  MonProfilConge,
  SoldeConge,
} from '../../../../../models/conge.model';
import { ORDRE_TYPES_CONGE, LIBELLES_TYPE_CONGE } from '../../../../../constants/conges.constants';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

/**
 * Dépôt d'une demande de congé.
 *
 * Par défaut le demandeur est l'utilisateur connecté : le serveur le résout
 * depuis l'e-mail du JWT et le contrôle `employeId` n'existe même pas dans le
 * formulaire. Seuls les profils RH / SUPERADMIN voient le sélecteur d'employé
 * (et déclenchent alors le chargement de la liste des employés).
 */
@Component({
  selector: 'app-demande-conge',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './demande-conge.component.html',
  styleUrl: './demande-conge.component.scss',
})
export class DemandeCongeComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  employes: DossierEmploye[] = [];
  soldeEmployeSelectionne: SoldeConge | null = null;
  profil: MonProfilConge | null = null;
  submitting = false;

  /** true ⇒ le `<select>` employé est rendu et `employeId` fait partie du formulaire. */
  pourAutrui = false;

  readonly ORDRE_TYPES_CONGE = ORDRE_TYPES_CONGE;
  readonly LIBELLES_TYPE_CONGE = LIBELLES_TYPE_CONGE;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private congeService: CongeService,
    private permissions: CongePermissionsService,
    private dossierService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.pourAutrui = this.permissions.peutCreerPourAutrui();

    this.form = this.fb.group({
      type: ['ANNUEL', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      motif: [''],
    });

    if (this.pourAutrui) {
      // Contrôle ajouté seulement pour les profils habilités : pour les autres,
      // il n'existe pas et n'est donc jamais transmis au serveur.
      this.form.addControl('employeId', this.fb.control('', Validators.required));

      this.dossierService.getEmployes(0, 500).pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
        takeUntil(this.destroy$),
      ).subscribe(res => (this.employes = res.content));

      this.form.get('employeId')!.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(id => this.chargerSolde(id));
    }

    this.permissions.charger().pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.profil = p;
      // Profil personnel : le solde affiché est le sien, chargé une seule fois.
      if (!this.pourAutrui && p?.employeId) this.chargerSolde(p.employeId);
    });
  }

  private chargerSolde(employeId: string): void {
    if (!employeId) { this.soldeEmployeSelectionne = null; return; }
    this.congeService.getSoldeEmploye(employeId).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$),
    ).subscribe(s => (this.soldeEmployeSelectionne = s));
  }

  // ─── Circuit affiché sous le formulaire ───────────────────────────────────

  /** Nom du validateur de niveau 1, ou `null` si le demandeur n'a pas de supérieur. */
  get superieurNom(): string | null {
    if (this.pourAutrui) {
      const id = this.form?.get('employeId')?.value;
      const e = this.employes.find(x => x.id === id);
      return e?.superieurHierarchiqueNom ?? null;
    }
    return this.profil?.superieurHierarchiqueNom ?? null;
  }

  /**
   * true quand on sait que le niveau 1 sera sauté : le circuit démarrera
   * directement à la RH. On ne l'affiche que si le demandeur est identifié,
   * pour ne pas alarmer avant sélection.
   */
  get sansSuperieur(): boolean {
    if (this.pourAutrui) {
      const id = this.form?.get('employeId')?.value;
      if (!id) return false;
      const e = this.employes.find(x => x.id === id);
      return !!e && !e.superieurHierarchiqueId;
    }
    return !!this.profil && !this.profil.superieurHierarchiqueId;
  }

  /** Le compte n'est rattaché à aucun dossier employé : dépôt impossible. */
  get profilNonRattache(): boolean {
    return !this.pourAutrui && !!this.profil && !this.profil.employeId;
  }

  // ─── Soumission ───────────────────────────────────────────────────────────

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez remplir tous les champs obligatoires.', 'Formulaire incomplet');
      return;
    }

    if (this.form.value.dateFin < this.form.value.dateDebut) {
      this.toastr.warning('La date de fin doit être après la date de début.', 'Dates invalides');
      return;
    }

    const v = this.form.value;
    const payload: CreationDemandePayload = {
      type: v.type,
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      motif: v.motif || undefined,
      // Absent pour un dépôt personnel : le serveur résout le demandeur via le JWT.
      ...(this.pourAutrui && v.employeId ? { employeId: v.employeId } : {}),
    };

    this.submitting = true;
    this.congeService.creerDemande(payload).pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      finalize(() => (this.submitting = false)),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      if (!res) return;
      const validateur = res.superieurHierarchiqueNom ?? 'le Responsable RH';
      this.toastr.success(`Demande soumise — en attente de validation par ${validateur}.`, 'Succès');
      this.router.navigate(['/admin/rh/temps-et-presences/conges']);
    });
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/conges']);
  }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else if (err?.status === 403) this.toastr.error('Action non autorisée pour votre profil.', 'Accès refusé');
    else if (err?.status === 422) this.toastr.error(err?.error?.message ?? 'Demande invalide.', 'Refusé');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
