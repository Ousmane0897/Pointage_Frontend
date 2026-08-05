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
import { DossierEmploye, AffectationSite } from '../../../../../models/dossier-employe.model';
import { TerrainSiteClientService } from '../../../../../services/terrain-site-client.service';
import { SiteClient, EffectifSite } from '../../../../../models/terrain-site-client.model';
import { DocumentEmployeService } from '../../../../../services/document-employe.service';
import { CategorieDocument } from '../../../../../models/document-employe.model';
import { ContratService } from '../../../../../services/contrat.service';
import { TypeContrat } from '../../../../../models/contrat.model';

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
  /** Séparateur d'affichage/stockage quand plusieurs sites sont dérivés dans `siteAffecte`. */
  readonly SEPARATEUR_SITES = ' - ';
  /** Découpe tolérante : « / », « , » (espaces optionnels) OU espace-tiret-espace. */
  private readonly SPLIT_SITES = /\s*[/,]\s*|\s+-\s+/;
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

  readonly joursTravailOptions = [
    { valeur: 'LUN_VEN', libelle: 'Lundi - Vendredi' },
    { valeur: 'LUN_SAM', libelle: 'Lundi - Samedi' },
    { valeur: 'LUN_DIM', libelle: 'Lundi - Dimanche' },
  ];

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
      }),
      // Étape 2
      poste: this.fb.group({
        poste: ['', Validators.required],
        departement: ['', Validators.required],
        // Affectations : sites + tranche horaire optionnelle. `siteAffecte` (rétro-compat)
        // n'est plus un champ de saisie : il est dérivé au moment de la sauvegarde.
        affectations: this.fb.array([], this.auMoinsUnSiteValidator),
        dateEntree: [null, Validators.required],
        statut: ['ACTIF', Validators.required],
        superieurHierarchiqueId: ['', Validators.required],
        dureeEssaiMois: [null],
        joursTravail: ['LUN_VEN', Validators.required],
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

  /** Fabrique une ligne d'affectation (site requis, horaires optionnels mais cohérents). */
  private creerLigneAffectation(a?: AffectationSite): FormGroup {
    const groupe = this.fb.group(
      {
        site: [a?.site ?? '', Validators.required],
        horaireDebut: [a?.horaireDebut ?? ''],
        horaireFin: [a?.horaireFin ?? ''],
      },
      { validators: this.coherenceHoraireValidator },
    );
    this.brancherControleCapacite(groupe);
    return groupe;
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
          this.toastr.error(`Le nombre maximum d'employé pour ${nom} est atteint`);
          groupe.get('site')!.setValue('', { emitEvent: false });
          return;
        }
        // Occupation projetée après ajout de cet employé (qui occupera un poste).
        const apresAjout = eff.nombreActuel + 1;
        this.toastr.info(`Le site possède actuellement ${apresAjout} / ${eff.nombreMax}.`);
      });
  }

  /** True si `nom` est déjà présent dans une autre ligne du FormArray. */
  private siteEnDoublon(nom: string, groupeCourant: FormGroup): boolean {
    return this.affectations.controls.some(
      c => c !== groupeCourant && (c.get('site')?.value ?? '').trim() === nom,
    );
  }

  /** Ajoute une ligne d'affectation vide et rafraîchit les options de sites. */
  ajouterAffectation(): void {
    this.affectations.push(this.creerLigneAffectation());
    this.affectations.markAsTouched();
  }

  /** Retire la ligne d'affectation à l'index donné et recompose les options. */
  retirerAffectation(i: number): void {
    this.affectations.removeAt(i);
    this.affectations.markAsTouched();
    this.recomposerSitesDisponibles();
  }

  /** Erreur `aucunSite` si le FormArray ne contient aucune affectation. */
  private auMoinsUnSiteValidator(control: AbstractControl): ValidationErrors | null {
    return (control as FormArray).length === 0 ? { aucunSite: true } : null;
  }

  /** Erreur `horaireIncoherent` si début ET fin sont saisis avec début >= fin. */
  private coherenceHoraireValidator(group: AbstractControl): ValidationErrors | null {
    const debut = group.get('horaireDebut')?.value;
    const fin = group.get('horaireFin')?.value;
    if (debut && fin && debut >= fin) {
      return { horaireIncoherent: true };
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

  // ─── Sites (affectations) ─────────────────────────────────────────────────
  /** Éclate une string multi-sites en sites individuels (séparateurs tolérés). */
  private splitSites(v: string | null | undefined): string[] {
    return (v ?? '').split(this.SPLIT_SITES).map(s => s.trim()).filter(Boolean);
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
              dateEntree: this.toDateInput(employe.dateEntree),
              statut: employe.statut,
              superieurHierarchiqueId: employe.superieurHierarchiqueId ?? '',
              dureeEssaiMois: employe.dureeEssaiMois ?? null,
              joursTravail: employe.joursTravail ?? 'LUN_VEN',
            },
            contacts: {
              telephone: employe.telephone,
              email: employe.email,
              adresse: employe.adresse,
              contactUrgence: employe.contactUrgence ?? { nom: '', lienParente: '', telephone: '' },
            },
          });

          // Hydrate le FormArray des affectations. Priorité au champ structuré
          // `affectations` ; sinon fallback rétro-compat sur la string `siteAffecte`
          // (une ligne par site, sans horaire).
          this.affectations.clear();
          const affectations: AffectationSite[] = employe.affectations?.length
            ? employe.affectations
            : this.splitSites(employe.siteAffecte).map(site => ({ site }));
          // Mémorise les sites déjà rattachés pour ne pas les bloquer contre eux-mêmes.
          this.sitesInitiaux = new Set(
            affectations.map(a => (a.site ?? '').trim()).filter(Boolean),
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
    employePayload.dateEntree = this.toDateInput(employePayload.dateEntree);

    // Affectations : on nettoie les lignes (site requis) et on dérive `siteAffecte`
    // (noms joints par « - ») pour la rétro-compatibilité (liste, pointage, filtres).
    const affectations: AffectationSite[] = (v.poste.affectations ?? [])
      .filter((a: AffectationSite) => (a.site ?? '').trim())
      .map((a: AffectationSite) => ({
        site: a.site.trim(),
        horaireDebut: a.horaireDebut || undefined,
        horaireFin: a.horaireFin || undefined,
      }));
    employePayload.affectations = affectations;
    employePayload.siteAffecte = affectations.map(a => a.site).join(this.SEPARATEUR_SITES);

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

  get libelleJoursTravail(): string {
    const v = this.posteGroup?.get('joursTravail')?.value;
    return this.joursTravailOptions.find(o => o.valeur === v)?.libelle ?? '';
  }

  get libelleGenre(): string {
    return this.identiteGroup?.get('genre')?.value === 'HOMME' ? 'Homme' : 'Femme';
  }

  get libelleSituation(): string {
    const v = this.identiteGroup?.get('situationMatrimoniale')?.value;
    if (v === 'MARIE') return 'Marié(e)';
    if (v === 'CELIBATAIRE') return 'Célibataire';
    return '';
  }

  get superieurSelectionne(): DossierEmploye | null {
    const id = this.posteGroup?.get('superieurHierarchiqueId')?.value;
    return this.superieursHierarchiques.find(e => e.id === id) ?? null;
  }
}
