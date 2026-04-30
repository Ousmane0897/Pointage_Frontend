import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  catchError,
  finalize,
  of,
  takeUntil,
  forkJoin,
} from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { ContratService } from '../../../../../services/contrat.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { Contrat, TypeContrat } from '../../../../../models/contrat.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';

@Component({
  selector: 'app-formulaire-contrat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './formulaire-contrat.component.html',
  styleUrl: './formulaire-contrat.component.scss',
})
export class FormulaireContratComponent implements OnInit, OnDestroy {

  // ─── Mode ─────────────────────────────────────────────────────────────────
  isEditMode = false;
  contratId: string | null = null;
  routeEmployeId: string | null = null;

  // ─── Formulaire réactif ───────────────────────────────────────────────────
  contratForm!: FormGroup;

  // ─── Employés (pour la sélection) ────────────────────────────────────────
  employes: DossierEmploye[] = [];
  employeSelectionne: DossierEmploye | null = null;

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
  saving = false;
  errorMessage = '';

  // ─── Upload fichier contrat ───────────────────────────────────────────────
  selectedFile: File | null = null;
  dragOver = false;
  fichierExistant: { nom: string; url?: string } | null = null;

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private contratService: ContratService,
    private dossierEmployeService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initContratForm();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        // Mode édition
        this.isEditMode = true;
        this.contratId = params['id'];
        this.loadContratForEdit(params['id']);
      } else {
        // Mode création
        this.routeEmployeId = params['employeId'] ?? null;
        if (this.routeEmployeId) {
          this.contratForm.patchValue({ employeId: this.routeEmployeId });
          this.loadEmployeById(this.routeEmployeId);
        } else {
          this.loadEmployesList();
        }
      }
    });
  }

  /**
   * Initialise le formulaire réactif avec les mêmes validations qu'avant.
   * La validation conditionnelle de dateFin est gérée via valueChanges sur typeContrat.
   */
  private initContratForm(): void {
    this.contratForm = this.fb.group({
      employeId: ['', Validators.required],
      typeContrat: ['CDI' as TypeContrat, Validators.required],
      dateDebut: [null, Validators.required],
      // dateFin est requis si pas CDI — géré dynamiquement plus bas
      dateFin: [null],
      statut: ['ACTIF', Validators.required],
      clauses: [''],
      joursAvantAlerte: [30],
    });

    // Validation conditionnelle : dateFin requise si typeContrat ≠ CDI
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

  // ─── Chargement contrat (édition) ─────────────────────────────────────────
  private loadContratForEdit(id: string): void {
    this.loading = true;
    forkJoin({
      contrat: this.contratService.getContratById(id).pipe(catchError(() => of(null))),
      employes: this.dossierEmployeService.getEmployes(0, 200).pipe(catchError(() => of({ content: [], totalElements: 0 }))),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ contrat, employes }) => {
        this.employes = employes.content;
        if (contrat) {
          this.contratForm.patchValue(contrat);
          if (contrat.fichierContratUrl || contrat.fichierContratNom) {
            this.fichierExistant = {
              nom: contrat.fichierContratNom ?? 'Fichier du contrat',
              url: contrat.fichierContratUrl,
            };
          }
        } else {
          this.toastr.error('Contrat introuvable.', 'Erreur');
          this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
        }
      });
  }

  // ─── Upload fichier contrat ───────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
    }
  }

  retirerFichier(): void {
    this.selectedFile = null;
  }

  formatFileSize(bytes?: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  telechargerFichierContrat(): void {
    if (!this.contratId) return;
    this.contratService.telechargerContrat(this.contratId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.fichierExistant?.nom ?? 'contrat';
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => this.toastr.error('Impossible de télécharger le fichier.', 'Erreur'),
      });
  }

  supprimerFichierContratExistant(): void {
    if (!this.contratId) return;
    this.contratService.supprimerFichierContrat(this.contratId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.fichierExistant = null;
          this.toastr.success('Fichier supprimé.', 'Succès');
        },
        error: () => this.toastr.error('Suppression impossible.', 'Erreur'),
      });
  }

  // ─── Chargement d'un employé spécifique ───────────────────────────────────
  private loadEmployeById(employeId: string): void {
    this.loading = true;
    this.dossierEmployeService
      .getEmployeById(employeId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(employe => {
        if (employe) {
          this.employeSelectionne = employe;
        } else {
          this.toastr.error('Employé introuvable.', 'Erreur');
        }
      });
  }

  // ─── Chargement liste employés ────────────────────────────────────────────
  private loadEmployesList(): void {
    this.loading = true;
    this.dossierEmployeService
      .getEmployes(0, 200)
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 })),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.employes = res.content;
      });
  }

  // ─── Helpers type contrat ─────────────────────────────────────────────────
  get isDateFinRequired(): boolean {
    return this.contratForm?.get('typeContrat')?.value !== 'CDI';
  }

  get showJoursAlerte(): boolean {
    const t = this.contratForm?.get('typeContrat')?.value;
    return t === 'CDD' || t === 'STAGE';
  }

  // Plus utilisé : la validation conditionnelle est gérée dans initContratForm()
  // via valueChanges sur typeContrat. Méthode conservée pour compat HTML.
  onTypeContratChange(): void {
    // no-op
  }

  // ─── Sauvegarde ───────────────────────────────────────────────────────────
  sauvegarder(): void {
    if (this.contratForm.invalid) {
      this.contratForm.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les erreurs dans le formulaire.', 'Formulaire invalide');
      return;
    }

    const payload = this.contratForm.value as Contrat;

    if (this.isDateFinRequired && !payload.dateFin) {
      this.toastr.warning('La date de fin est obligatoire pour ce type de contrat.', 'Champ requis');
      return;
    }

    this.saving = true;

    const formData = new FormData();
    formData.append('contrat', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (this.selectedFile) {
      formData.append('fichier', this.selectedFile, this.selectedFile.name);
    }

    const operation$ = this.isEditMode && this.contratId
      ? this.contratService.modifierContrat(this.contratId, formData)
      : this.contratService.creerContrat(formData);

    operation$
      .pipe(
        catchError(err => {
          console.error('Erreur sauvegarde contrat :', err);
          const msg = err?.error?.message ?? 'Erreur lors de la sauvegarde du contrat.';
          this.toastr.error(msg, 'Erreur');
          return of(null);
        }),
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (res) {
          const action = this.isEditMode ? 'modifié' : 'créé';
          this.toastr.success(`Contrat ${action} avec succès.`, 'Succès');
          this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
        }
      });
  }

  // ─── Annulation ───────────────────────────────────────────────────────────
  annuler(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
