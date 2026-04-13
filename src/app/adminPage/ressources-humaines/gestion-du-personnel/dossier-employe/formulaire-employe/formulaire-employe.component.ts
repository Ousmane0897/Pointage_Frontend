import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
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
    FormsModule,
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

  // ─── Données employé ──────────────────────────────────────────────────────
  employeData: DossierEmploye = {
    matricule: '',
    nom: '',
    prenom: '',
    dateNaissance: null,
    genre: 'HOMME',
    nationalite: '',
    photoUrl: '',
    poste: '',
    departement: '',
    siteAffecte: '',
    dateEntree: null,
    statut: 'ACTIF',
    telephone: '',
    email: '',
    adresse: '',
    contactUrgence: {
      nom: '',
      lienParente: '',
      telephone: '',
    },
  };

  // ─── Listes de référence ──────────────────────────────────────────────────
  departements: string[] = [];
  sites: string[] = [];
  postes: string[] = [];

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
  ) {}

  // ─── Initialisation ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.employeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.employeId;

    this.chargerReferentiels();

    if (this.isEditMode && this.employeId) {
      this.chargerEmploye(this.employeId);
    }
  }

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
          this.employeData = { ...employe };
          if (employe.photoUrl) {
            this.previewUrl = employe.photoUrl;
          }
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
  etapeSuivante(form: NgForm): void {
    this.erreurEtape = null;

    if (!this.validerEtape(form)) {
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

  private validerEtape(form: NgForm): boolean {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.values(form.controls).forEach((ctrl) => ctrl.markAsTouched());

    switch (this.etapeActuelle) {
      case 1: {
        const champIdentite = ['nom', 'prenom', 'dateNaissance', 'genre', 'nationalite'];
        const invalide = champIdentite.some((c) => form.controls[c]?.invalid);
        if (invalide) {
          this.erreurEtape = 'Veuillez remplir tous les champs obligatoires de l\'identité.';
          return false;
        }
        return true;
      }
      case 2: {
        const champPoste = ['poste', 'departement', 'siteAffecte', 'dateEntree', 'statut'];
        const invalide = champPoste.some((c) => form.controls[c]?.invalid);
        if (invalide) {
          this.erreurEtape = 'Veuillez remplir tous les champs obligatoires du poste.';
          return false;
        }
        return true;
      }
      case 3: {
        const champContacts = ['telephone', 'email', 'adresse'];
        const invalide = champContacts.some((c) => form.controls[c]?.invalid);
        if (invalide) {
          this.erreurEtape = 'Veuillez remplir tous les champs obligatoires des contacts.';
          return false;
        }
        return true;
      }
      default:
        return true;
    }
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
    this.employeData.photoUrl = '';
  }

  // ─── Sauvegarde ───────────────────────────────────────────────────────────
  sauvegarder(form: NgForm): void {
    if (form.invalid) {
      Object.values(form.controls).forEach((ctrl) => ctrl.markAsTouched());
      this.toastr.warning('Veuillez corriger les erreurs du formulaire.', 'Formulaire incomplet');
      return;
    }

    this.enregistrement = true;

    const formData = new FormData();
    const employeJson = JSON.stringify(this.employeData);
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
    return this.statutOptions.find((s) => s.valeur === this.employeData.statut)?.libelle ?? '';
  }

  get libelleGenre(): string {
    return this.employeData.genre === 'HOMME' ? 'Homme' : 'Femme';
  }
}
