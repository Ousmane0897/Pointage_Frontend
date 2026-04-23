import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';

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
  etapeActuelle = 1;
  readonly etapes = [
    'Identité',
    'Poste & Affectation',
    'Contacts',
    'Récapitulatif',
  ];

  // ─── État UI ──────────────────────────────────────────────────────────────
  loading = false;
  enregistrement = false;
  erreurEtape: string | null = null;

  // ─── Photo ────────────────────────────────────────────────────────────────
  photoFile: File | null = null;
  previewUrl: string | null = null;

  // ─── Formulaire réactif (multi-étapes via sous-FormGroup) ─────────────────
  employeForm!: FormGroup;
  // photoUrl reste hors du FormGroup pour rester silencieux
  photoUrl = '';

  // ─── Listes de référence ──────────────────────────────────────────────────
  departements: string[] = [];
  sites: string[] = [];
  postes: string[] = [];
  superieursHierarchiques: DossierEmploye[] = [];

  readonly statutOptions = [
    { valeur: 'ACTIF', libelle: 'Actif' },
    { valeur: 'EN_PERIODE_ESSAI', libelle: 'En période d\'essai' },
    { valeur: 'SUSPENDU', libelle: 'Suspendu' },
    { valeur: 'SORTI', libelle: 'Sorti' },
  ];

  constructor(
    private dossierEmployeService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) {}

  // ─── Initialisation ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initEmployeForm();
    this.employeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.employeId;

    this.chargerReferentiels();
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
        matricule: ['', [Validators.required, Validators.maxLength(30)]],
        numeroIdentification: ['', Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: [null, Validators.required],
        genre: ['HOMME', Validators.required],
        nationalite: ['', Validators.required],
        situationMatrimoniale: ['', Validators.required],
        nombreEnfants: [null],
      }),
      // Étape 2
      poste: this.fb.group({
        poste: ['', Validators.required],
        departement: ['', Validators.required],
        siteAffecte: ['', Validators.required],
        dateEntree: [null, Validators.required],
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

    // Validator dynamique : nombreEnfants requis si situation = MARIE
    this.identiteGroup.get('situationMatrimoniale')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((valeur: string) => {
        const ctrl = this.identiteGroup.get('nombreEnfants')!;
        if (valeur === 'MARIE') {
          ctrl.setValidators([Validators.required, Validators.min(0)]);
        } else {
          ctrl.clearValidators();
          ctrl.setValue(null, { emitEvent: false });
        }
        ctrl.updateValueAndValidity();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Chargement des données ───────────────────────────────────────────────
  private chargerReferentiels(): void {
    this.dossierEmployeService.getDepartements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (d) => (this.departements = d), error: () => {} });

    this.dossierEmployeService.getSites()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (s) => (this.sites = s), error: () => {} });

    this.dossierEmployeService.getPostes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (p) => (this.postes = p), error: () => {} });
  }

  private chargerEmploye(id: string): void {
    this.loading = true;
    this.dossierEmployeService.getEmployeById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employe) => {
          this.photoUrl = employe.photoUrl ?? '';
          if (employe.photoUrl) {
            this.previewUrl = employe.photoUrl;
          }

          // Hydrate les sous-FormGroup
          this.employeForm.patchValue({
            identite: {
              matricule: employe.matricule ?? '',
              numeroIdentification: employe.numeroIdentification ?? '',
              nom: employe.nom,
              prenom: employe.prenom,
              dateNaissance: employe.dateNaissance,
              genre: employe.genre,
              nationalite: employe.nationalite,
              situationMatrimoniale: employe.situationMatrimoniale ?? '',
              nombreEnfants: employe.nombreEnfants ?? null,
            },
            poste: {
              poste: employe.poste,
              departement: employe.departement,
              siteAffecte: employe.siteAffecte,
              dateEntree: employe.dateEntree,
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
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(fichier);
  }

  supprimerPhoto(): void {
    this.photoFile = null;
    this.previewUrl = null;
    this.photoUrl = '';
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

    const formData = new FormData();
    const employeJson = JSON.stringify(employePayload);
    formData.append('employe', new Blob([employeJson], { type: 'application/json' }));

    if (this.photoFile) {
      formData.append('photo', this.photoFile, this.photoFile.name);
    }

    if (this.isEditMode && this.employeId) {
      this.dossierEmployeService.modifierEmploye(this.employeId, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Employé modifié avec succès.', 'Succès');
            this.router.navigate(['../../'], { relativeTo: this.route });
          },
          error: () => {
            this.toastr.error('Une erreur est survenue lors de la modification.', 'Erreur');
            this.enregistrement = false;
          },
        });
    } else {
      this.dossierEmployeService.creerEmploye(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Employé créé avec succès.', 'Succès');
            this.router.navigate(['../'], { relativeTo: this.route });
          },
          error: () => {
            this.toastr.error('Une erreur est survenue lors de la création.', 'Erreur');
            this.enregistrement = false;
          },
        });
    }
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
