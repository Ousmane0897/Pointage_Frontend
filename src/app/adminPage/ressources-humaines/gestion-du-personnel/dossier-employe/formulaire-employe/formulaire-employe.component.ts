import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, of, forkJoin } from 'rxjs';
import { catchError, takeUntil, debounceTime, switchMap, map } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  DossierEmploye,
  AffectationSite,
  EnfantEmploye,
  JourSemaine,
  OPTIONS_JOURS_TRAVAIL,
  OPTIONS_JOUR_REPOS,
  OPTIONS_JOUR_SEMAINE,
  SEPARATEUR_SITES,
  affectationTerminee,
  jourReposApplicable,
  joursSemaineExplicites,
  libelleRythmeAffectation,
  splitSites,
} from '../../../../../models/dossier-employe.model';
import { TerrainSiteClientService } from '../../../../../services/terrain-site-client.service';
import { SiteClient, EffectifSite } from '../../../../../models/terrain-site-client.model';
import { messageSiteComplet } from '../../../../../constants/terrain.constants';
import { DocumentEmployeService } from '../../../../../services/document-employe.service';
import { CategorieDocument } from '../../../../../models/document-employe.model';
import { ContratService } from '../../../../../services/contrat.service';
import { TypeContrat } from '../../../../../models/contrat.model';

/**
 * Valeur brute d'une ligne d'affectation telle que la rend `getRawValue()`.
 *
 * Le formulaire porte les jours travaillés en **sept cases à cocher** (`joursSemaineFlags`)
 * là où le modèle attend une liste d'indices : les deux formes ne coïncident donc pas, et le
 * payload convertit explicitement l'une en l'autre.
 */
type LigneAffectationRaw = AffectationSite & { joursSemaineFlags: boolean[] };

/**
 * Cases cochées → indices `getDay()`. L'index du tableau **est** la valeur métier (0 =
 * dimanche), aucune table de conversion n'intervient.
 *
 * Fonction libre plutôt que méthode : elle est appelée sur un `AbstractControl` (récapitulatif)
 * comme sur une valeur brute (payload), et une deuxième copie divergerait au premier ajustement.
 */
function joursDepuisFlags(flags: readonly boolean[] | null | undefined): JourSemaine[] {
  return (flags ?? [])
    .map((coche, i) => (coche ? (i as JourSemaine) : null))
    .filter((j): j is JourSemaine => j !== null);
}

/** Document collecté en mémoire pendant l'assistant, uploadé après la création/màj de l'employé. */
interface DocumentStage {
  nom: string;
  categorie: CategorieDocument;
  dateExpiration?: string;
  fichier: File;
}

@Component({
  selector: 'app-formulaire-employe',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './formulaire-employe.component.html',
  styleUrl: './formulaire-employe.component.scss',
})
export class FormulaireEmployeComponent implements OnInit, OnDestroy {

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  // ─── Mode formulaire ──────────────────────────────────────────────────────
  isEditMode = false;
  employeId: string | null = null;

  // ─── Étapes ───────────────────────────────────────────────────────────────
  // L'étape « Contrat » n'est proposée qu'à la création : en modification, les
  // contrats se gèrent depuis l'onglet Contrats de la fiche employé.
  etapeActuelle = 1;
  etapes: string[] = [
    'Identité',
    'Poste & Affectation',
    'Contacts',
    'Documents',
    'Récapitulatif',
  ];

  /** Libellé de l'étape en cours — les positions variant selon le mode. */
  get etapeCourante(): string {
    return this.etapes[this.etapeActuelle - 1];
  }

  // ─── État UI ──────────────────────────────────────────────────────────────
  loading = false;
  enregistrement = false;
  erreurEtape: string | null = null;

  // ─── Photo ────────────────────────────────────────────────────────────────
  photoFile: File | null = null;
  previewUrl: string | null = null;
  /** True quand previewUrl est un ObjectURL local à révoquer au nettoyage. */
  private previewUrlIsObject = false;

  // ─── Formulaire réactif (multi-étapes via sous-FormGroup) ─────────────────
  employeForm!: FormGroup;
  // photoUrl reste hors du FormGroup pour rester silencieux
  photoUrl = '';

  // ─── Listes de référence ──────────────────────────────────────────────────
  departements: string[] = [];
  postes: string[] = [];
  superieursHierarchiques: DossierEmploye[] = [];

  // ─── Sites (affectations multiples avec tranche horaire) ──────────────────
  /** Options proposées dans le `<select>` de chaque ligne (référentiel + sites déjà affectés). */
  sitesDisponibles: string[] = [];
  /** Noms des sites actifs du référentiel « Sites clients » (source unique). */
  private sitesReferentiel: string[] = [];
  /** Résolution nom de site → objet complet (pour lire `id` + `nombreMaxEmployes`). */
  private sitesParNom = new Map<string, SiteClient>();
  /** Sites déjà rattachés à l'employé en base (édition) : ne se bloquent pas eux-mêmes. */
  private sitesInitiaux = new Set<string>();

  readonly statutOptions = [
    { valeur: 'ACTIF', libelle: 'Actif' },
    { valeur: 'EN_PERIODE_ESSAI', libelle: 'En période d\'essai' },
    { valeur: 'SUSPENDU', libelle: 'Suspendu' },
    { valeur: 'SORTI', libelle: 'Sorti' },
  ];

  readonly joursTravailOptions = OPTIONS_JOURS_TRAVAIL;
  readonly jourReposOptions = OPTIONS_JOUR_REPOS;
  readonly joursSemaineOptions = OPTIONS_JOUR_SEMAINE;

  /**
   * Le champ « Jour de repos » n'est rendu que pour les rythmes de plus de cinq jours :
   * en `LUN_VEN`, la semaine ouvrée porte déjà ses deux jours de repos. Sans objet aussi
   * en « Jours personnalisés », où les cases cochées disent déjà tout.
   */
  jourReposVisible(ligne: AbstractControl): boolean {
    return jourReposApplicable(ligne.get('joursTravail')?.value);
  }

  /** Les sept cases « jours travaillés » ne sont rendues que pour un rythme personnalisé. */
  joursSemaineVisible(ligne: AbstractControl): boolean {
    return ligne.get('joursTravail')?.value === 'PERSONNALISE';
  }

  /** `FormArray` des sept cases d'une ligne d'affectation, adressé par le template. */
  joursSemaineFlags(ligne: AbstractControl): FormArray {
    return ligne.get('joursSemaineFlags') as FormArray;
  }

  /**
   * Jours cochés d'une ligne du formulaire (récapitulatif).
   *
   * ⚠ `getRawValue()` : sur une affectation close tout est désactivé, et `value` rendrait
   * un tableau vide — la ligne d'historique paraîtrait sans jours.
   */
  private joursSemaineCoches(ligne: AbstractControl): JourSemaine[] {
    return joursDepuisFlags(this.joursSemaineFlags(ligne)?.getRawValue() as boolean[]);
  }

  /** Même conversion, depuis la valeur brute du FormArray (construction du payload). */
  private joursSemaineDepuisFlags(a: LigneAffectationRaw): JourSemaine[] {
    return joursDepuisFlags(a.joursSemaineFlags);
  }

  // ─── Documents (étape 4 — collecte en mémoire, upload après création) ────────
  /** Formulaire de saisie d'un document à ajouter à la liste. */
  documentForm!: FormGroup;
  /** Fichier sélectionné pour le document en cours de saisie. */
  documentFile: File | null = null;
  dragOverDoc = false;
  /** Documents collectés, uploadés après la création/màj de l'employé. */
  documentsAjoutes: DocumentStage[] = [];
  /** Catégories proposées dans le select de l'étape Documents. */
  readonly categoriesDocument: { valeur: CategorieDocument; libelle: string }[] = [
    { valeur: 'CNI', libelle: "Carte d'identité" },
    { valeur: 'DIPLOME', libelle: 'Diplôme' },
    { valeur: 'CERTIFICAT', libelle: 'Certificat' },
    { valeur: 'ATTESTATION', libelle: 'Attestation' },
    { valeur: 'CONTRAT', libelle: 'Contrat' },
    { valeur: 'AUTRE', libelle: 'Autre' },
  ];

  // ─── Contrat (étape création uniquement — créé après l'employé) ──────────
  /** Formulaire du contrat initial. `employeId` est injecté à l'envoi. */
  contratForm!: FormGroup;
  /** Fichier du contrat (PDF/DOC), envoyé avec le contrat. */
  contratFile: File | null = null;
  dragOverContrat = false;

  constructor(
    private dossierEmployeService: DossierEmployeService,
    private terrainSiteClientService: TerrainSiteClientService,
    private documentEmployeService: DocumentEmployeService,
    private contratService: ContratService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) {}

  // ─── Initialisation ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initEmployeForm();
    this.documentForm = this.fb.group({
      nom: ['', Validators.required],
      categorie: ['', Validators.required],
      dateExpiration: [''],
    });
    this.employeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.employeId;

    // L'étape « Contrat » s'intercale entre Documents et Récapitulatif, à la création seulement.
    if (!this.isEditMode) {
      this.initContratForm();
      this.etapes.splice(this.etapes.indexOf('Récapitulatif'), 0, 'Contrat');
    }

    this.chargerReferentiels();
    this.chargerSitesClients();
    this.chargerSuperieursHierarchiques();

    if (this.isEditMode && this.employeId) {
      this.chargerEmploye(this.employeId);
    }
  }

  private chargerSuperieursHierarchiques(): void {
    this.dossierEmployeService.getEmployes(0, 500)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.superieursHierarchiques = res.content.filter(
            e => (e.statut === 'ACTIF' || e.statut === 'EN_PERIODE_ESSAI')
              && e.id !== this.employeId,
          );
        },
        error: () => {},
      });
  }

  /**
   * Initialise le formulaire réactif organisé en 3 sous-FormGroup
   * (un par étape de saisie). Le 4ᵉ étape n'est qu'un récapitulatif.
   * Reproduit fidèlement les validations existantes (required + email).
   */
  private initEmployeForm(): void {
    this.employeForm = this.fb.group({
      // Étape 1
      identite: this.fb.group({
        agentId: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
        matricule: ['', [Validators.required, Validators.maxLength(30)]],
        numeroIdentification: ['', Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: [null, Validators.required],
        genre: ['HOMME', Validators.required],
        nationalite: ['', Validators.required],
        situationMatrimoniale: ['', Validators.required],
        nombreEnfants: [null, Validators.min(0)],
        // Enfants datés — c'est la date de naissance, et non le compteur, qui ouvre le
        // droit à congé supplémentaire par enfant.
        enfants: this.fb.array([]),
      }),
      // Étape 2
      poste: this.fb.group({
        poste: ['', Validators.required],
        departement: ['', Validators.required],
        // Affectations : sites + tranche horaire optionnelle. `siteAffecte` (rétro-compat)
        // n'est plus un champ de saisie : il est dérivé au moment de la sauvegarde.
        affectations: this.fb.array([], this.auMoinsUnSiteValidator),
        dateEmbauche: [null, Validators.required],
        statut: ['ACTIF', Validators.required],
        superieurHierarchiqueId: ['', Validators.required],
        dureeEssaiMois: [null],
      }),
      // Étape 3
      contacts: this.fb.group({
        telephone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        adresse: ['', Validators.required],
        contactUrgence: this.fb.group({
          nom: [''],
          lienParente: [''],
          telephone: [''],
        }),
      }),
    });

    // Validator dynamique : dureeEssaiMois requis si statut = EN_PERIODE_ESSAI
    this.posteGroup.get('statut')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((statut: string) => {
        const ctrl = this.posteGroup.get('dureeEssaiMois')!;
        if (statut === 'EN_PERIODE_ESSAI') {
          ctrl.setValidators([Validators.required, Validators.min(1)]);
        } else {
          ctrl.clearValidators();
          ctrl.setValue(null, { emitEvent: false });
        }
        ctrl.updateValueAndValidity();
      });
  }

  /** Raccourcis vers les sous-groupes pour le template. */
  get identiteGroup(): FormGroup { return this.employeForm.get('identite') as FormGroup; }
  get posteGroup(): FormGroup { return this.employeForm.get('poste') as FormGroup; }
  get contactsGroup(): FormGroup { return this.employeForm.get('contacts') as FormGroup; }
  get contactUrgenceGroup(): FormGroup { return this.contactsGroup.get('contactUrgence') as FormGroup; }

  /** FormArray des affectations (site + tranche horaire). */
  get affectations(): FormArray { return this.posteGroup.get('affectations') as FormArray; }

  /**
   * Fabrique une ligne d'affectation : site et date d'entrée requis, horaires
   * optionnels mais cohérents, jours de travail propres au site.
   *
   * ⚠ `dateSortie` naît **désactivée** : c'est ce qui matérialise « sortie inconnue,
   * l'employé est toujours en poste sur ce site ». L'utilisateur l'active par la case
   * à cocher le jour où il quitte le site. Un contrôle désactivé sortant de
   * `form.value`, la lecture du FormArray se fait partout via `getRawValue()`.
   */
  private creerLigneAffectation(a?: AffectationSite): FormGroup {
    const dateSortie = this.toDateInput(a?.dateSortie);
    // Normalisé par le modèle (7 ISO ramené à 0, doublons et valeurs hors bornes écartés) :
    // une liste venue du serveur ne doit pas cocher une case fantôme.
    const joursCoches = a ? joursSemaineExplicites(a) : [];
    const groupe = this.fb.group(
      {
        id: [a?.id ?? null],
        site: [a?.site ?? '', Validators.required],
        horaireDebut: [a?.horaireDebut ?? ''],
        horaireFin: [a?.horaireFin ?? ''],
        dateEntree: [this.toDateInput(a?.dateEntree) ?? '', Validators.required],
        dateSortie: [{ value: dateSortie ?? '', disabled: !dateSortie }],
        joursTravail: [a?.joursTravail ?? 'LUN_VEN', Validators.required],
        // ⚠ Pas de `Validators.required` : le jour de repos est **optionnel**, et son
        // absence porte un sens — « repos le dimanche », le cas de tout le parc. L'exiger
        // rendrait invalide chaque fiche ouverte pour un tout autre motif.
        jourRepos: [a?.jourRepos ?? null],
        // Sept cases à cocher, **indexées par `getDay()`** : index 0 = dimanche … 6 = samedi.
        // ⚠ L'index EST la valeur métier. Le template itère sur `joursSemaineOptions` (lundi
        // → dimanche, ordre de lecture) et adresse le contrôle par son indice : découpler
        // l'ordre d'affichage de l'index de stockage évite la conversion la plus facile à
        // rater du module.
        //
        // ⚠ Un `FormArray` de booléens plutôt qu'un `FormControl<JourSemaine[]>` : `ngModel`
        // est interdit ici (ReactiveForms exclusivement), et surtout `disable()` d'un groupe
        // propage à ses descendants — une affectation close devient donc lecture seule sans
        // aucune garde manuelle, contrairement à la case « sortie renseignée » qui vit hors
        // du formulaire et doit porter son `[disabled]` à la main.
        joursSemaineFlags: this.fb.array(
          [0, 1, 2, 3, 4, 5, 6].map(i =>
            this.fb.control(joursCoches.includes(i as JourSemaine)),
          ),
        ),
      },
      { validators: this.coherenceLigneValidator },
    );

    // Affectation close : elle appartient à l'historique de l'agent et n'est plus
    // modifiable. ⚠ Un groupe désactivé reste dans `getRawValue()`, donc dans le
    // payload — c'est ce qui garantit qu'un enregistrement ne l'efface pas. Inutile
    // aussi de brancher le contrôle de capacité : la ligne n'occupe plus de poste.
    if (a && affectationTerminee(a)) {
      groupe.disable();
      return groupe;
    }

    this.brancherControleCapacite(groupe);
    return groupe;
  }

  /** True si l'affectation `i` est close : lecture seule, non supprimable. */
  estCloturee(i: number): boolean {
    return this.affectations.at(i).disabled;
  }

  /** True si la date de sortie de la ligne `i` est renseignée (case cochée). */
  sortieRenseignee(i: number): boolean {
    const ligne = this.affectations.at(i);
    // Sur une ligne close, tout est désactivé : c'est la valeur qui fait foi.
    return ligne.disabled
      ? !!ligne.get('dateSortie')!.value
      : ligne.get('dateSortie')!.enabled;
  }

  /**
   * Bascule la case « Sortie renseignée ». Décocher **vide** le contrôle : une date
   * de sortie invisible mais persistée ferait sortir l'employé du site à son insu.
   */
  basculerDateSortie(i: number, actif: boolean): void {
    const ctrl = this.affectations.at(i).get('dateSortie')!;
    if (actif) {
      ctrl.enable();
    } else {
      ctrl.setValue('');
      ctrl.disable();
    }
  }

  /**
   * Contrôle du plafond `nombreMaxEmployes` du site à chaque changement de la ligne.
   * La valeur initiale d'un `fb.group` n'émet pas ⇒ l'hydratation en édition ne déclenche
   * rien ; seul un choix explicite de l'utilisateur lance la vérification. Le `switchMap`
   * annule un comptage obsolète si l'on change de site rapidement.
   */
  private brancherControleCapacite(groupe: FormGroup): void {
    const siteCtrl = groupe.get('site')!;
    siteCtrl.valueChanges
      .pipe(
        debounceTime(250),
        switchMap((valeur) => {
          const nom = (valeur ?? '').trim();
          if (!nom) return of(null);

          // Un même site ne peut être affecté deux fois au même employé.
          if (this.siteEnDoublon(nom, groupe)) {
            this.toastr.error('Ce site est déjà affecté à l\'employé.');
            siteCtrl.setValue('', { emitEvent: false });
            return of(null);
          }

          const site = this.sitesParNom.get(nom);
          // Pas d'id ou pas de plafond configuré ⇒ aucun contrôle.
          if (!site?.id || site.nombreMaxEmployes == null) return of(null);

          return this.terrainSiteClientService
            .compterEffectif(site.id, 'RH', { excludeEmployeId: this.employeId ?? undefined })
            .pipe(
              catchError(() => of(null)),
              map((eff) => (eff ? { eff, nom } : null)),
            );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((res) => {
        if (!res) return;
        const { eff, nom } = res as { eff: EffectifSite; nom: string };
        if (eff.nombreMax == null) return;

        // `nombreActuel` exclut déjà l'employé courant (excludeEmployeId).
        const dejaRattache = this.sitesInitiaux.has(nom);
        if (!dejaRattache && eff.nombreActuel >= eff.nombreMax) {
          this.toastr.error(messageSiteComplet(nom, eff));
          groupe.get('site')!.setValue('', { emitEvent: false });
          return;
        }
        // Occupation projetée après ajout de cet employé (qui occupera un poste).
        const apresAjout = eff.nombreActuel + 1;
        this.toastr.info(`Le site possède actuellement ${apresAjout} / ${eff.nombreMax}.`);
      });
  }

  /**
   * True si `nom` est déjà présent dans une autre ligne **en cours** du FormArray.
   *
   * ⚠ Les lignes closes sont volontairement exclues : un agent peut revenir sur un
   * site qu'il a quitté, et l'interdire obligerait à écraser le passage précédent —
   * c'est-à-dire à détruire l'historique qu'on cherche justement à conserver.
   */
  private siteEnDoublon(nom: string, groupeCourant: FormGroup): boolean {
    return this.affectations.controls.some(
      c => c !== groupeCourant
        && c.enabled
        && (c.get('site')?.value ?? '').trim() === nom,
    );
  }

  // ─── Enfants à charge ─────────────────────────────────────────────────────

  /** FormArray des enfants (prénom + date de naissance). */
  get enfants(): FormArray { return this.identiteGroup.get('enfants') as FormArray; }

  /**
   * Fabrique une ligne d'enfant. `id` est un contrôle **caché** : sans lui,
   * `getRawValue()` le perdrait et le serveur ne reconnaîtrait plus la ligne
   * persistée — même raison que l'`id` des affectations.
   */
  private creerLigneEnfant(e?: EnfantEmploye): FormGroup {
    return this.fb.group({
      id: [e?.id ?? null],
      prenom: [e?.prenom ?? '', Validators.required],
      dateNaissance: [
        this.toDateInput(e?.dateNaissance) ?? '',
        [Validators.required, this.naissancePasDansLeFuturValidator],
      ],
    });
  }

  /** Une date de naissance ne peut pas être postérieure à aujourd'hui. */
  private naissancePasDansLeFuturValidator = (control: AbstractControl): ValidationErrors | null => {
    const valeur = (control.value ?? '') as string;
    if (!valeur) return null;
    // Comparaison lexicale sur `yyyy-MM-dd` : l'ordre ISO est exact, et la date du jour
    // est construite en local — `toISOString()` décalerait d'un jour selon le fuseau.
    return valeur.slice(0, 10) > this.dateDuJourLocale() ? { naissanceFuture: true } : null;
  };

  private dateDuJourLocale(): string {
    const d = new Date();
    const mois = `${d.getMonth() + 1}`.padStart(2, '0');
    const jour = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${mois}-${jour}`;
  }

  ajouterEnfant(): void {
    this.enfants.push(this.creerLigneEnfant());
    this.enfants.markAsTouched();
    this.synchroniserNombreEnfants();
  }

  retirerEnfant(i: number): void {
    this.enfants.removeAt(i);
    this.enfants.markAsTouched();
    this.synchroniserNombreEnfants();
  }

  /**
   * Aligne `nombreEnfants` sur la longueur de la liste dès qu'elle est renseignée.
   *
   * ⚠ Le contrôle n'est **jamais `disable()`** pour le rendre dérivé : un contrôle
   * désactivé sort de `form.value` et le compteur disparaîtrait du payload (même piège
   * que `dateSortie`). Il est seulement rendu `readonly` côté template. Liste vide ⇒ on
   * laisse la saisie manuelle, seul moyen pour un dossier antérieur de conserver son
   * compteur sans dates.
   */
  private synchroniserNombreEnfants(): void {
    if (this.enfants.length === 0) return;
    this.identiteGroup.get('nombreEnfants')!
      .setValue(this.enfants.length, { emitEvent: false });
  }

  /** True quand le compteur est piloté par la liste (champ en lecture seule). */
  get nombreEnfantsDerive(): boolean {
    return this.enfants.length > 0;
  }

  /**
   * Dossier antérieur : un compteur d'enfants mais aucune date de naissance. On invite
   * à les saisir — c'est le point d'entrée de la migration, le droit à congé
   * supplémentaire ne pouvant pas se calculer sans elles.
   */
  get enfantsSansDates(): number {
    const compteur = this.identiteGroup?.get('nombreEnfants')?.value ?? 0;
    return this.enfants.length === 0 && compteur > 0 ? compteur : 0;
  }

  /** Ajoute une ligne d'affectation vide et rafraîchit les options de sites. */
  ajouterAffectation(): void {
    this.affectations.push(this.creerLigneAffectation());
    this.affectations.markAsTouched();
  }

  /**
   * Retire la ligne d'affectation à l'index donné et recompose les options.
   * Garde explicite : une affectation close fait partie de l'historique de l'agent,
   * le masquage du bouton dans le template ne doit pas être la seule barrière.
   */
  retirerAffectation(i: number): void {
    if (this.estCloturee(i)) return;
    this.affectations.removeAt(i);
    this.affectations.markAsTouched();
    this.recomposerSitesDisponibles();
  }

  /** Erreur `aucunSite` si le FormArray ne contient aucune affectation. */
  private auMoinsUnSiteValidator(control: AbstractControl): ValidationErrors | null {
    return (control as FormArray).length === 0 ? { aucunSite: true } : null;
  }

  /**
   * Cohérence d'une ligne d'affectation :
   * - `horaireIncoherent` si début ET fin sont saisis avec début >= fin ;
   * - `sortieAvantEntree` si la date de sortie (activée) précède la date d'entrée.
   *
   * ⚠ `dateSortie` est désactivée tant que la sortie est inconnue — son contrôle est
   * lu directement (et non via `group.value`, qui l'omettrait), mais la règle ne
   * s'applique que s'il est `enabled`.
   */
  private coherenceLigneValidator(group: AbstractControl): ValidationErrors | null {
    // « Jours personnalisés » sans aucune case cochée : la ligne ne dit rien du rythme. Le
    // serveur refuse cette combinaison, car elle retomberait sur son échelon permissif —
    // donc sur zéro absence, l'inverse de ce que la RH croit avoir saisi.
    // ⚠ `getRawValue()` et non `value` : sur une ligne close le FormArray est désactivé et
    // `value` rendrait un tableau vide, faisant échouer une ligne d'historique intouchable.
    if (group.get('joursTravail')?.value === 'PERSONNALISE') {
      const flags = group.get('joursSemaineFlags') as FormArray | null;
      const aucun = !flags || (flags.getRawValue() as boolean[]).every(coche => !coche);
      if (aucun) return { joursPersonnalisesVides: true };
    }

    const debut = group.get('horaireDebut')?.value;
    const fin = group.get('horaireFin')?.value;
    if (debut && fin && debut >= fin) {
      return { horaireIncoherent: true };
    }

    const sortieCtrl = group.get('dateSortie');
    const entree = group.get('dateEntree')?.value;
    if (sortieCtrl?.enabled && sortieCtrl.value && entree && sortieCtrl.value < entree) {
      return { sortieAvantEntree: true };
    }
    return null;
  }

  ngOnDestroy(): void {
    this.revoquerPreviewUrlSiObjet();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Chargement des données ───────────────────────────────────────────────
  private chargerReferentiels(): void {
    // Départements et postes restent dérivés des employés existants ; les sites,
    // eux, proviennent désormais du référentiel « Sites clients » (cf. chargerSitesClients()).
    this.dossierEmployeService
      .getValeursFiltres()
      .pipe(
        catchError(() => of({ departements: [], sites: [], postes: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe(({ departements, postes }) => {
        this.departements = departements;
        this.postes = postes;
      });
  }

  /**
   * Charge les sites proposés dans la fiche employé depuis le référentiel unique
   * « Sites clients » (module Exploitation). Renommer/supprimer un site là-bas se
   * répercute donc automatiquement ici au prochain chargement du formulaire.
   */
  private chargerSitesClients(): void {
    this.terrainSiteClientService
      .listerActifs()
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe((sites) => {
        this.sitesReferentiel = [...new Set(
          sites.map(s => (s.nom ?? '').trim()).filter(Boolean),
        )];
        this.sitesParNom.clear();
        sites.forEach(s => {
          const nom = (s.nom ?? '').trim();
          if (nom) this.sitesParNom.set(nom, s);
        });
        this.recomposerSitesDisponibles();
      });
  }

  /**
   * Recompose les options proposées dans le `<select>` de chaque ligne
   * (`sitesDisponibles`). Robuste face à la course entre `chargerSitesClients()` et
   * `chargerEmploye()` : on réunit toujours le référentiel et les sites déjà affectés,
   * de sorte qu'un site affecté mais retiré du référentiel reste sélectionnable.
   */
  private recomposerSitesDisponibles(): void {
    const union = new Set([...this.sitesReferentiel, ...this.sitesAffectes()]);
    this.sitesDisponibles = [...union].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  /** Noms de sites actuellement présents dans le FormArray des affectations. */
  private sitesAffectes(): string[] {
    return this.affectations.controls
      .map(c => (c.get('site')?.value ?? '').trim())
      .filter(Boolean);
  }

  /** True si le nom de site n'existe plus dans le référentiel « Sites clients ». */
  siteObsolete(nom: string | null | undefined): boolean {
    const v = (nom ?? '').trim();
    return !!v && !this.sitesReferentiel.includes(v);
  }

  /**
   * Normalise une date renvoyée par le backend (ISO datetime, ISO date, objet Date
   * ou tableau [y,m,d]) vers le format `yyyy-MM-dd` attendu à la fois par
   * `<input type="date">` (affichage) et par le backend (parsing `LocalDate`).
   * Sans cette normalisation, une valeur `"1990-05-20T00:00:00.000+00:00"` reste
   * stockée telle quelle dans le FormControl puis est renvoyée verbatim → 400.
   */
  private toDateInput(valeur: unknown): string | null {
    if (!valeur) return null;
    if (typeof valeur === 'string') {
      // "1990-05-20T00:00:00.000+00:00" ou "1990-05-20" → 10 premiers caractères
      return valeur.length >= 10 ? valeur.slice(0, 10) : valeur;
    }
    if (Array.isArray(valeur) && valeur.length >= 3) {
      const [y, m, d] = valeur as number[];
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    if (valeur instanceof Date && !isNaN(valeur.getTime())) {
      return valeur.toISOString().slice(0, 10);
    }
    return null;
  }

  private chargerEmploye(id: string): void {
    this.loading = true;
    this.dossierEmployeService.getEmployeById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employe) => {
          this.photoUrl = employe.photoUrl ?? '';
          if (employe.photoUrl && employe.id) {
            this.chargerPhotoBlob(employe.id);
          }

          // Hydrate les sous-FormGroup
          this.employeForm.patchValue({
            identite: {
              agentId: employe.agentId ?? '',
              matricule: employe.matricule ?? '',
              numeroIdentification: employe.numeroIdentification ?? '',
              nom: employe.nom,
              prenom: employe.prenom,
              dateNaissance: this.toDateInput(employe.dateNaissance),
              genre: employe.genre,
              nationalite: employe.nationalite,
              situationMatrimoniale: employe.situationMatrimoniale ?? '',
              nombreEnfants: employe.nombreEnfants ?? null,
            },
            poste: {
              poste: employe.poste,
              departement: employe.departement,
              // siteAffecte est géré par la sélection multi-sites (cf. ci-dessous)
              dateEmbauche: this.toDateInput(employe.dateEmbauche),
              statut: employe.statut,
              superieurHierarchiqueId: employe.superieurHierarchiqueId ?? '',
              dureeEssaiMois: employe.dureeEssaiMois ?? null,
            },
            contacts: {
              telephone: employe.telephone,
              email: employe.email,
              adresse: employe.adresse,
              contactUrgence: employe.contactUrgence ?? { nom: '', lienParente: '', telephone: '' },
            },
          });

          // Hydrate le FormArray des enfants. ⚠ Une liste vide avec un `nombreEnfants`
          // non nul (dossier antérieur à la saisie datée) ne fabrique **aucune ligne
          // vide** : le formulaire serait invalide d'emblée sur une fiche que
          // l'utilisateur n'ouvre peut-être que pour corriger un téléphone. Un encart
          // l'invite à les saisir (cf. `enfantsSansDates`).
          this.enfants.clear();
          (employe.enfants ?? []).forEach(e => this.enfants.push(this.creerLigneEnfant(e)));

          // Hydrate le FormArray des affectations. Priorité au champ structuré
          // `affectations` ; sinon fallback rétro-compat sur la string `siteAffecte`
          // (une ligne par site, sans horaire). ⚠ Les lignes dérivées doivent porter
          // une date d'entrée et des jours de travail, sinon une fiche antérieure au
          // rattachement de ces champs au site s'ouvrirait invalide : on retombe sur
          // la date d'embauche et la semaine ouvrée par défaut.
          this.affectations.clear();
          const affectations: AffectationSite[] = employe.affectations?.length
            ? employe.affectations
            : splitSites(employe.siteAffecte).map(site => ({
                site,
                dateEntree: this.toDateInput(employe.dateEmbauche),
                joursTravail: 'LUN_VEN' as const,
              }));
          // Mémorise les sites déjà rattachés pour ne pas les bloquer contre eux-mêmes.
          // ⚠ Les affectations closes en sont exclues : l'agent n'y occupe plus de poste,
          // et l'y réaffecter doit repasser par le contrôle de plafond du site.
          this.sitesInitiaux = new Set(
            affectations
              .filter(a => !affectationTerminee(a))
              .map(a => (a.site ?? '').trim())
              .filter(Boolean),
          );
          affectations.forEach(a => this.affectations.push(this.creerLigneAffectation(a)));
          this.recomposerSitesDisponibles();

          this.loading = false;
        },
        error: () => {
          this.toastr.error('Impossible de charger les données de l\'employé.', 'Erreur');
          this.loading = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
      });
  }

  // ─── Navigation entre étapes ──────────────────────────────────────────────
  etapeSuivante(): void {
    this.erreurEtape = null;

    if (!this.validerEtape()) {
      return;
    }

    if (this.etapeActuelle < this.etapes.length) {
      this.etapeActuelle++;
    }
  }

  etapePrecedente(): void {
    this.erreurEtape = null;
    if (this.etapeActuelle > 1) {
      this.etapeActuelle--;
    }
  }

  /**
   * Valide uniquement le sous-FormGroup correspondant à l'étape courante.
   * Reproduit la logique d'origine étape par étape.
   */
  private validerEtape(): boolean {
    let groupe: FormGroup | null = null;
    let messageErreur = '';

    // Étape « Contrat » : optionnelle, mais cohérente dès qu'elle est entamée.
    if (this.etapeCourante === 'Contrat') {
      return this.validerEtapeContrat();
    }

    switch (this.etapeActuelle) {
      case 1:
        groupe = this.identiteGroup;
        messageErreur = 'Veuillez remplir tous les champs obligatoires de l\'identité.';
        break;
      case 2:
        groupe = this.posteGroup;
        messageErreur = 'Veuillez remplir tous les champs obligatoires du poste.';
        break;
      case 3:
        groupe = this.contactsGroup;
        messageErreur = 'Veuillez remplir tous les champs obligatoires des contacts.';
        break;
      default:
        return true;
    }

    groupe.markAllAsTouched();
    if (groupe.invalid) {
      this.erreurEtape = messageErreur;
      return false;
    }
    return true;
  }

  /**
   * L'étape Contrat peut être passée sans rien saisir (l'employé est alors créé
   * sans contrat). Dès qu'elle est entamée, les champs obligatoires s'appliquent.
   */
  private validerEtapeContrat(): boolean {
    if (!this.contratRenseigne) return true;

    this.contratForm.markAllAsTouched();

    if (!this.contratForm.get('dateDebut')?.value) {
      this.erreurEtape = 'La date de début du contrat est obligatoire.';
      return false;
    }
    if (this.isDateFinRequired && !this.contratForm.get('dateFin')?.value) {
      this.erreurEtape = 'La date de fin est obligatoire pour ce type de contrat.';
      return false;
    }
    if (this.contratForm.invalid) {
      this.erreurEtape = 'Veuillez corriger les champs du contrat.';
      return false;
    }
    return true;
  }

  // ─── Récupération du binaire photo (endpoint protégé par JWT) ────────────
  private chargerPhotoBlob(id: string): void {
    this.dossierEmployeService
      .getPhotoBlob(id)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(blob => {
        if (blob) {
          this.revoquerPreviewUrlSiObjet();
          this.previewUrl = URL.createObjectURL(blob);
          this.previewUrlIsObject = true;
        }
      });
  }

  private revoquerPreviewUrlSiObjet(): void {
    if (this.previewUrlIsObject && this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrlIsObject = false;
  }

  // ─── Gestion de la photo ──────────────────────────────────────────────────
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const fichier = input.files[0];
    const typesAcceptes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!typesAcceptes.includes(fichier.type)) {
      this.toastr.warning('Seuls les formats JPG, PNG et WebP sont acceptés.', 'Format invalide');
      return;
    }

    if (fichier.size > 5 * 1024 * 1024) {
      this.toastr.warning('La photo ne doit pas dépasser 5 Mo.', 'Fichier trop lourd');
      return;
    }

    this.photoFile = fichier;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.revoquerPreviewUrlSiObjet();
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(fichier);
  }

  supprimerPhoto(): void {
    this.photoFile = null;
    this.revoquerPreviewUrlSiObjet();
    this.previewUrl = null;
    this.photoUrl = '';
  }

  // ─── Documents (étape 4) ──────────────────────────────────────────────────
  onDocFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.documentFile = input.files[0];
    }
  }

  onDocDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOverDoc = true;
  }

  onDocDragLeave(): void {
    this.dragOverDoc = false;
  }

  onDocDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOverDoc = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.documentFile = event.dataTransfer.files[0];
    }
  }

  /** Ajoute le document en cours de saisie à la liste (collecte en mémoire). */
  ajouterDocument(): void {
    if (this.documentForm.invalid || !this.documentFile) {
      this.documentForm.markAllAsTouched();
      this.toastr.warning(
        'Renseignez le nom, la catégorie et sélectionnez un fichier.',
        'Document incomplet',
      );
      return;
    }
    const v = this.documentForm.value;
    this.documentsAjoutes.push({
      nom: v.nom,
      categorie: v.categorie,
      dateExpiration: v.dateExpiration || undefined,
      fichier: this.documentFile,
    });
    this.documentForm.reset({ nom: '', categorie: '', dateExpiration: '' });
    this.documentFile = null;
  }

  retirerDocument(index: number): void {
    this.documentsAjoutes.splice(index, 1);
  }

  libelleCategorieDocument(categorie: CategorieDocument): string {
    return this.categoriesDocument.find(c => c.valeur === categorie)?.libelle ?? categorie;
  }

  /**
   * Upload les documents collectés (`documentsAjoutes`) pour l'employé `employeId`,
   * puis exécute `onDone`. Si aucun document, appelle `onDone` directement. Un échec
   * partiel n'empêche pas la finalisation (toast d'avertissement).
   */
  private televerserDocuments(employeId: string, onDone: () => void): void {
    if (this.documentsAjoutes.length === 0) {
      onDone();
      return;
    }

    const requetes = this.documentsAjoutes.map(doc => {
      const fd = new FormData();
      fd.append('employeId', employeId);
      fd.append('nom', doc.nom);
      fd.append('categorie', doc.categorie);
      if (doc.dateExpiration) {
        fd.append('dateExpiration', doc.dateExpiration);
      }
      fd.append('fichier', doc.fichier);
      return this.documentEmployeService.uploadDocument(fd).pipe(
        catchError(() => of(null)),
      );
    });

    forkJoin(requetes)
      .pipe(takeUntil(this.destroy$))
      .subscribe(resultats => {
        const echecs = resultats.filter(r => r === null).length;
        if (echecs > 0) {
          this.toastr.warning(
            `${echecs} document(s) n'ont pas pu être envoyés. Vous pourrez les rajouter depuis la fiche de l'employé.`,
            'Documents partiellement enregistrés',
          );
        }
        onDone();
      });
  }

  // ─── Contrat (étape création uniquement) ─────────────────────────────────
  /**
   * Formulaire du contrat initial. Volontairement sans contrôle `employeId`
   * (inconnu tant que l'employé n'existe pas) ni `Validators.required` sur
   * `dateDebut` : l'étape est optionnelle, la contrainte est portée par
   * `validerEtape()` dès lors que l'utilisateur a commencé à la remplir.
   */
  private initContratForm(): void {
    this.contratForm = this.fb.group({
      typeContrat: ['CDI' as TypeContrat, Validators.required],
      dateDebut: [null],
      dateFin: [null],
      statut: ['ACTIF'],
      clauses: [''],
      joursAvantAlerte: [30],
    });

    // dateFin est requise pour tout type de contrat autre que le CDI.
    this.contratForm.get('typeContrat')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type: TypeContrat) => {
        const dateFinCtrl = this.contratForm.get('dateFin')!;
        if (type === 'CDI') {
          dateFinCtrl.clearValidators();
          dateFinCtrl.setValue(null);
        } else {
          dateFinCtrl.setValidators(Validators.required);
        }
        dateFinCtrl.updateValueAndValidity();
      });
  }

  /** L'utilisateur a-t-il commencé à renseigner un contrat ? (le type a une valeur par défaut) */
  get contratRenseigne(): boolean {
    return !!this.contratForm?.get('dateDebut')?.value || !!this.contratFile;
  }

  get isDateFinRequired(): boolean {
    return this.contratForm?.get('typeContrat')?.value !== 'CDI';
  }

  get showJoursAlerte(): boolean {
    const type = this.contratForm?.get('typeContrat')?.value;
    return type === 'CDD' || type === 'STAGE';
  }

  onContratFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.contratFile = input.files[0];
    }
  }

  onContratDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOverContrat = true;
  }

  onContratDragLeave(): void {
    this.dragOverContrat = false;
  }

  onContratDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOverContrat = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.contratFile = event.dataTransfer.files[0];
    }
  }

  retirerFichierContrat(): void {
    this.contratFile = null;
  }

  formatFileSize(bytes?: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  /**
   * Crée le contrat initial pour l'employé `employeId` si l'étape a été renseignée,
   * puis exécute `onDone`. Comme pour les documents, un échec n'annule pas la
   * création de l'employé (déjà persistée) : simple avertissement.
   */
  private creerContratSiRenseigne(employeId: string, onDone: () => void): void {
    if (!this.contratRenseigne) {
      onDone();
      return;
    }

    const v = this.contratForm.value;
    const payload = {
      ...v,
      employeId,
      dateDebut: this.toDateInput(v.dateDebut),
      dateFin: v.dateFin ? this.toDateInput(v.dateFin) : null,
    };

    const fd = new FormData();
    fd.append('contrat', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (this.contratFile) {
      fd.append('fichier', this.contratFile, this.contratFile.name);
    }

    this.contratService.creerContrat(fd)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(res => {
        if (!res) {
          this.toastr.warning(
            "Le contrat n'a pas pu être enregistré. Vous pourrez l'ajouter depuis la fiche de l'employé.",
            'Contrat non enregistré',
          );
        }
        onDone();
      });
  }

  // ─── Sauvegarde ───────────────────────────────────────────────────────────
  sauvegarder(): void {
    if (this.employeForm.invalid) {
      this.employeForm.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les erreurs du formulaire.', 'Formulaire incomplet');
      return;
    }

    this.enregistrement = true;

    // Reconstitue l'objet DossierEmploye à partir des sous-FormGroup
    const v = this.employeForm.value;
    const superieur = this.superieursHierarchiques.find(
      e => e.id === v.poste.superieurHierarchiqueId,
    );
    const employePayload = {
      photoUrl: this.photoUrl,
      ...v.identite,
      ...v.poste,
      ...v.contacts,
      superieurHierarchiqueNom: superieur
        ? `${superieur.prenom} ${superieur.nom}`
        : undefined,
    };

    // Défense : garantit le format "yyyy-MM-dd" (le backend parse en LocalDate)
    employePayload.dateNaissance = this.toDateInput(employePayload.dateNaissance);
    employePayload.dateEmbauche = this.toDateInput(employePayload.dateEmbauche);

    // Affectations : on nettoie les lignes (site requis) et on dérive `siteAffecte`
    // (noms joints par « - ») pour la rétro-compatibilité (liste, pointage, filtres).
    // ⚠ Lecture via `getRawValue()` et non `v.poste.affectations` : `dateSortie` est
    // désactivée tant que la sortie est inconnue, et un contrôle désactivé est absent
    // de `form.value` — une sortie renseignée serait silencieusement perdue.
    const affectations: AffectationSite[] = (this.affectations.getRawValue() ?? [])
      .filter((a: LigneAffectationRaw) => (a.site ?? '').trim())
      .map((a: LigneAffectationRaw) => ({
        // Renvoyé tel quel : c'est lui qui permet au serveur de reconnaître une
        // affectation déjà persistée (et de refuser la disparition d'une ligne close).
        id: a.id ?? undefined,
        site: a.site.trim(),
        horaireDebut: a.horaireDebut || undefined,
        horaireFin: a.horaireFin || undefined,
        dateEntree: this.toDateInput(a.dateEntree),
        dateSortie: this.toDateInput(a.dateSortie) ?? undefined,
        joursTravail: a.joursTravail,
        // ⚠ `null` explicite et non `undefined` : c'est ce qui permet de **retirer** un
        // jour de repos saisi par erreur. Avec `undefined`, le champ disparaîtrait du
        // payload et le serveur conserverait l'ancienne valeur — même piège que
        // `dateFin` d'une affectation de planning, réaffectée explicitement côté serveur.
        jourRepos: jourReposApplicable(a.joursTravail) ? (a.jourRepos ?? null) : null,
        // ⚠ **`null` dès que le rythme n'est pas personnalisé, et c'est essentiel** : la
        // liste fait autorité côté serveur dès qu'elle est non vide. Sans cette remise à
        // zéro, repasser de « Jours personnalisés » à « Lundi - Vendredi » laisserait les
        // anciens jours en base et le rythme choisi dans le `<select>` resterait ignoré.
        joursSemaine:
          a.joursTravail === 'PERSONNALISE' ? this.joursSemaineDepuisFlags(a) : null,
      }));
    employePayload.affectations = affectations;
    employePayload.siteAffecte = affectations.map(a => a.site).join(SEPARATEUR_SITES);

    // Enfants : lignes incomplètes écartées, dates forcées en "yyyy-MM-dd".
    // ⚠ `getRawValue()` là aussi — et l'`id` doit faire le voyage, c'est lui qui permet
    // au serveur de reconnaître une ligne déjà persistée.
    employePayload.enfants = (this.enfants.getRawValue() ?? [])
      .filter((e: EnfantEmploye) => (e.prenom ?? '').trim() && e.dateNaissance)
      .map((e: EnfantEmploye) => ({
        id: e.id ?? undefined,
        prenom: e.prenom.trim(),
        dateNaissance: this.toDateInput(e.dateNaissance),
      }));

    const formData = new FormData();
    const employeJson = JSON.stringify(employePayload);
    formData.append('dossier', new Blob([employeJson], { type: 'application/json' }));

    if (this.photoFile) {
      formData.append('photo', this.photoFile, this.photoFile.name);
    }

    if (this.isEditMode && this.employeId) {
      const idEmploye = this.employeId;
      this.dossierEmployeService.modifierEmploye(idEmploye, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.televerserDocuments(idEmploye, () => {
              this.toastr.success('Employé modifié avec succès.', 'Succès');
              this.router.navigate(['../../'], { relativeTo: this.route });
            });
          },
          error: (err: HttpErrorResponse) => {
            this.toastr.error(this.messageErreurServeur(err, 'modification'), 'Erreur');
            this.enregistrement = false;
          },
        });
    } else {
      this.dossierEmployeService.creerEmploye(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (employe) => {
            // Cascade : documents, puis contrat initial — chaque étape tolérante aux pannes.
            this.televerserDocuments(employe.id!, () =>
              this.creerContratSiRenseigne(employe.id!, () => {
                this.toastr.success('Employé créé avec succès.', 'Succès');
                this.router.navigate(['../'], { relativeTo: this.route });
              }));
          },
          error: (err: HttpErrorResponse) => {
            this.toastr.error(this.messageErreurServeur(err, 'création'), 'Erreur');
            this.enregistrement = false;
          },
        });
    }
  }

  /**
   * Extrait un message lisible de la réponse d'erreur serveur si disponible
   * (`err.error.message` ou `err.error.error`), sinon un message générique.
   * Évite d'être aveugle sur la vraie cause d'un 400/422.
   */
  private messageErreurServeur(err: HttpErrorResponse, action: string): string {
    const corps = err?.error;
    const detail =
      (corps && typeof corps === 'object' && (corps.message || corps.error)) ||
      (typeof corps === 'string' ? corps : null);
    return detail
      ? `Erreur lors de la ${action} : ${detail}`
      : `Une erreur est survenue lors de la ${action}.`;
  }

  // ─── Annulation ───────────────────────────────────────────────────────────
  annuler(): void {
    if (this.isEditMode) {
      this.router.navigate(['../../'], { relativeTo: this.route });
    } else {
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }

  // ─── Utilitaires template ─────────────────────────────────────────────────
  get titreFormulaire(): string {
    return this.isEditMode ? 'Modifier un employé' : 'Nouvel employé';
  }

  get libelleStatut(): string {
    const statut = this.posteGroup?.get('statut')?.value;
    return this.statutOptions.find((s) => s.valeur === statut)?.libelle ?? '';
  }

  /**
   * Rythme d'une ligne du récapitulatif : « Lundi, Mercredi, Vendredi » pour des jours
   * explicites, sinon « Lundi - Samedi (repos mardi) ».
   *
   * ⚠ Un seul helper là où le template composait auparavant `libelleJoursTravail` et
   * `libelleReposLigne` : les trois cas (jours explicites, rythme + repos, rythme seul)
   * sont tranchés par `libelleRythmeAffectation`, point unique de vérité du modèle.
   */
  libelleRythmeLigne(ligne: AbstractControl): string {
    return libelleRythmeAffectation({
      joursTravail: ligne.get('joursTravail')?.value,
      jourRepos: ligne.get('jourRepos')?.value,
      joursSemaine: this.joursSemaineCoches(ligne),
    });
  }

  get libelleGenre(): string {
    return this.identiteGroup?.get('genre')?.value === 'HOMME' ? 'Homme' : 'Femme';
  }

  get libelleSituation(): string {
    const v = this.identiteGroup?.get('situationMatrimoniale')?.value;
    if (v === 'MARIE') return 'Marié(e)';
    if (v === 'CELIBATAIRE') return 'Célibataire';
    if (v === 'DIVORCE') return 'Divorcé(e)';
    if (v === 'VEUF') return 'Veuf(ve)';
    return '';
  }

  get superieurSelectionne(): DossierEmploye | null {
    const id = this.posteGroup?.get('superieurHierarchiqueId')?.value;
    return this.superieursHierarchiques.find(e => e.id === id) ?? null;
  }
}
