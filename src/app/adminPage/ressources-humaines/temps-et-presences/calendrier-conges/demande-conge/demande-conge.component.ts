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
import {
  CreationDemandePayload,
  EmployeSelectionnable,
  MonProfilConge,
  SoldeConge,
} from '../../../../../models/conge.model';
import {
  ORDRE_TYPES_CONGE,
  LIBELLES_TYPE_CONGE,
  PARAMETRES_CONGES,
  decompteLeSolde,
} from '../../../../../constants/conges.constants';

/**
 * Dépôt d'une demande de congé.
 *
 * Le champ « Employé » est **toujours rendu**, mais son contenu est borné par le
 * serveur (`GET /conges/employes-selectionnables`) : tous les employés pour
 * `RH` / `SUPERADMIN`, soi + ses subordonnés directs pour `EXPLOITATION`, soi
 * seul pour tout autre profil. Un seul choix ⇒ champ pré-rempli en lecture seule
 * plutôt qu'un `<select>` qu'on ne peut pas changer.
 *
 * ⚠ Le composant ne calcule **aucun** périmètre : il se contente de la liste
 * reçue. `peutCreerPourAutrui()` n'est utilisé que pour un libellé.
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
  employes: EmployeSelectionnable[] = [];
  soldeEmployeSelectionne: SoldeConge | null = null;
  profil: MonProfilConge | null = null;
  submitting = false;

  /** La liste des employés sélectionnables est-elle arrivée ? (état d'attente du champ) */
  employesCharges = false;

  /**
   * Un seul employé sélectionnable ⇒ champ pré-rempli en lecture seule.
   * ⚠ Vrai aussi tant que la liste n'est pas chargée : le champ reste inerte
   * plutôt que d'afficher un `<select>` vide, puis bascule si besoin.
   */
  get choixUnique(): boolean {
    return this.employes.length <= 1;
  }

  /** L'employé actuellement retenu, ou `null` avant sélection. */
  get employeSelectionne(): EmployeSelectionnable | null {
    const id = this.form?.getRawValue()?.employeId;
    return this.employes.find(e => e.id === id) ?? null;
  }

  /** Libellé de la liste : n'a de sens que si elle dépasse le seul demandeur. */
  get libelleListeRestreinte(): string | null {
    if (this.choixUnique || this.permissions.voitTousLesConges()) return null;
    return 'Vous et vos subordonnés directs';
  }

  readonly ORDRE_TYPES_CONGE = ORDRE_TYPES_CONGE;
  readonly LIBELLES_TYPE_CONGE = LIBELLES_TYPE_CONGE;
  readonly joursAcquisParMois = PARAMETRES_CONGES.joursAcquisParMois;

  /**
   * Le type sélectionné ampute-t-il le solde annuel ? Sert uniquement à prévenir avant
   * la soumission — le décompte réel est calculé serveur.
   */
  get typeDecompteLeSolde(): boolean {
    return decompteLeSolde(this.form?.get('type')?.value);
  }

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private congeService: CongeService,
    private permissions: CongePermissionsService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      type: ['ANNUEL', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      motif: [''],
      // Toujours présent : même un collaborateur voit au nom de qui il dépose.
      employeId: ['', Validators.required],
    });

    this.form.get('employeId')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(id => this.chargerSolde(id));

    this.congeService.getEmployesSelectionnables().pipe(
      catchError(() => of([] as EmployeSelectionnable[])),
      takeUntil(this.destroy$),
    ).subscribe(liste => {
      this.employes = liste;
      this.employesCharges = true;

      if (liste.length === 1) {
        // Choix unique : on le pose et on fige le contrôle. ⚠ Un contrôle
        // désactivé sort de `form.value` — d'où `getRawValue()` à la soumission.
        const employeId = this.form.get('employeId')!;
        employeId.setValue(liste[0].id);
        employeId.disable({ emitEvent: false });
      }
      // Liste multiple : aucune présélection. Déposer au nom de quelqu'un d'autre
      // est un acte délibéré — un demandeur pré-rempli s'enverrait par mégarde.
    });

    this.permissions.charger().pipe(takeUntil(this.destroy$))
      .subscribe(p => (this.profil = p));
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
    // Repli sur le profil tant que la liste n'est pas arrivée : le cas courant
    // est un dépôt pour soi, et le circuit doit s'afficher sans attendre.
    return this.employeSelectionne?.superieurHierarchiqueNom
      ?? (this.employesCharges ? null : this.profil?.superieurHierarchiqueNom ?? null);
  }

  /**
   * true quand on sait que le niveau 1 sera sauté : le circuit démarrera
   * directement à la RH. On ne l'affiche que si le demandeur est identifié,
   * pour ne pas alarmer avant sélection.
   */
  get sansSuperieur(): boolean {
    const e = this.employeSelectionne;
    if (e) return !e.superieurHierarchiqueId;
    if (this.employesCharges) return false;
    return !!this.profil && !this.profil.superieurHierarchiqueId;
  }

  /**
   * Aucun dépôt possible : le compte n'est rattaché à aucun dossier employé.
   * Le serveur le traduit par une liste de sélectionnables **vide** — jamais
   * totale — et refuserait la création (422).
   */
  get profilNonRattache(): boolean {
    if (this.employesCharges && this.employes.length === 0) return true;
    return !!this.profil && !this.profil.employeId;
  }

  // ─── Soumission ───────────────────────────────────────────────────────────

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez remplir tous les champs obligatoires.', 'Formulaire incomplet');
      return;
    }

    // ⚠ `getRawValue()` et non `value` : le contrôle `employeId` est désactivé
    // quand il n'y a qu'un choix, et sortirait donc de `form.value`.
    const v = this.form.getRawValue();

    if (v.dateFin < v.dateDebut) {
      this.toastr.warning('La date de fin doit être après la date de début.', 'Dates invalides');
      return;
    }

    // Dépôt pour un tiers ? `estMoi` fait autorité (calculé serveur) ; le profil
    // ne sert que de repli si la liste ne porte pas le drapeau.
    const cible = this.employes.find(e => e.id === v.employeId);
    const pourAutrui = !!v.employeId && (
      cible?.estMoi !== undefined
        ? !cible.estMoi
        : v.employeId !== this.profil?.employeId
    );
    const payload: CreationDemandePayload = {
      type: v.type,
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      motif: v.motif || undefined,
      // Omis pour un dépôt personnel : le serveur résout le demandeur via le JWT.
      ...(pourAutrui ? { employeId: v.employeId } : {}),
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
      this.router.navigate([this.destinationRetour()]);
    });
  }

  annuler(): void {
    this.router.navigate([this.destinationRetour()]);
  }

  /**
   * Écran de retour : le calendrier RH pour un profil qui voit tous les congés,
   * sinon l'auto-service — seule vue ouverte à un collaborateur sans droits RH.
   * `voitTousLesConges()` est restrictif si le profil n'est pas résolu, donc le
   * repli est toujours sûr.
   */
  private destinationRetour(): string {
    return this.permissions.voitTousLesConges()
      ? '/admin/rh/temps-et-presences/conges'
      : '/admin/rh/temps-et-presences/conges/mes-demandes';
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
