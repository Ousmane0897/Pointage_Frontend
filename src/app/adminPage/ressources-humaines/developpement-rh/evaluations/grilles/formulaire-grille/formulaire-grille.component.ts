import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, forkJoin, takeUntil } from 'rxjs';

import { EvaluationService } from '../../../../../../services/evaluation.service';
import { DossierEmployeService } from '../../../../../../services/dossier-employe.service';
import {
  GrilleEvaluation,
  CategoriesCritere,
  LIBELLES_CATEGORIE_CRITERE,
} from '../../../../../../models/evaluation.model';

@Component({
  selector: 'app-formulaire-grille',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-grille.component.html',
  styleUrl: './formulaire-grille.component.scss',
})
export class FormulaireGrilleComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isEditMode = false;
  grilleId: string | null = null;
  loading = false;
  saving = false;

  postes: string[] = [];
  departements: string[] = [];

  // Chip inputs
  posteInput = '';
  departementInput = '';

  categories = Object.entries(LIBELLES_CATEGORIE_CRITERE).map(([value, label]) => ({ value, label }));

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private evaluationService: EvaluationService,
    private dossierService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadReferenceData();

    this.grilleId = this.route.snapshot.paramMap.get('id');
    if (this.grilleId) {
      this.isEditMode = true;
      this.loadGrille(this.grilleId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      postesConcernes: [[] as string[]],
      departementsConcernes: [[] as string[]],
      actif: [true],
      criteres: this.fb.array([], [this.validateSommePoids]),
    });
  }

  get criteres(): FormArray {
    return this.form.get('criteres') as FormArray;
  }

  get sommePoids(): number {
    return this.criteres.controls.reduce((sum, c) => sum + (Number(c.get('poids')?.value) || 0), 0);
  }

  get postesConcernes(): string[] {
    return this.form.get('postesConcernes')?.value ?? [];
  }

  get departementsConcernes(): string[] {
    return this.form.get('departementsConcernes')?.value ?? [];
  }

  private loadReferenceData(): void {
    forkJoin({
      postes: this.dossierService.getPostes().pipe(catchError(() => of([] as string[]))),
      departements: this.dossierService.getDepartements().pipe(catchError(() => of([] as string[]))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(res => {
      this.postes = res.postes;
      this.departements = res.departements;
    });
  }

  private loadGrille(id: string): void {
    this.loading = true;
    this.evaluationService
      .getGrilleById(id)
      .pipe(
        catchError(() => {
          this.toastr.error('Impossible de charger la grille.', 'Erreur');
          this.router.navigate(['/admin/rh/developpement-rh/evaluations/grilles']);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(g => {
        this.loading = false;
        if (!g) return;
        this.form.patchValue({
          titre: g.titre,
          description: g.description ?? '',
          postesConcernes: g.postesConcernes ?? [],
          departementsConcernes: g.departementsConcernes ?? [],
          actif: g.actif,
        });
        // Rebuild criteres FormArray
        this.criteres.clear();
        (g.criteres ?? []).forEach(c => this.ajouterCritere(c.code, c.libelle, c.poids, c.categorie));
      });
  }

  ajouterCritere(code = '', libelle = '', poids = 0, categorie: CategoriesCritere = 'TECHNIQUE'): void {
    this.criteres.push(this.fb.group({
      code: [code, Validators.required],
      libelle: [libelle, Validators.required],
      poids: [poids, [Validators.required, Validators.min(1), Validators.max(100)]],
      categorie: [categorie, Validators.required],
    }));
  }

  supprimerCritere(index: number): void {
    this.criteres.removeAt(index);
  }

  // ─── Chip helpers ────────────────────────────────────────────────

  addPoste(value: string): void {
    const v = value.trim();
    if (v && !this.postesConcernes.includes(v)) {
      this.form.get('postesConcernes')?.setValue([...this.postesConcernes, v]);
    }
    this.posteInput = '';
  }

  removePoste(index: number): void {
    const arr = [...this.postesConcernes];
    arr.splice(index, 1);
    this.form.get('postesConcernes')?.setValue(arr);
  }

  addDepartement(value: string): void {
    const v = value.trim();
    if (v && !this.departementsConcernes.includes(v)) {
      this.form.get('departementsConcernes')?.setValue([...this.departementsConcernes, v]);
    }
    this.departementInput = '';
  }

  removeDepartement(index: number): void {
    const arr = [...this.departementsConcernes];
    arr.splice(index, 1);
    this.form.get('departementsConcernes')?.setValue(arr);
  }

  // ─── Validation ──────────────────────────────────────────────────

  private validateSommePoids(control: AbstractControl): ValidationErrors | null {
    const arr = control as FormArray;
    if (arr.length === 0) return null;
    const somme = arr.controls.reduce((s, c) => s + (Number(c.get('poids')?.value) || 0), 0);
    return somme === 100 ? null : { sommePoids: { actuelle: somme, attendue: 100 } };
  }

  // ─── Save ────────────────────────────────────────────────────────

  enregistrer(): void {
    if (this.form.invalid || this.criteres.length === 0) {
      this.form.markAllAsTouched();
      this.criteres.markAllAsTouched();
      if (this.criteres.length === 0) {
        this.toastr.warning('Ajoutez au moins un critère.', 'Formulaire incomplet');
      }
      if (this.sommePoids !== 100 && this.criteres.length > 0) {
        this.toastr.warning(`La somme des poids est de ${this.sommePoids}% (attendu : 100%).`, 'Poids invalides');
      }
      return;
    }

    this.saving = true;
    const grille: GrilleEvaluation = this.form.value;

    const obs$ = this.isEditMode
      ? this.evaluationService.modifierGrille(this.grilleId!, grille)
      : this.evaluationService.creerGrille(grille);

    obs$.pipe(
      catchError(() => {
        this.toastr.error('Erreur lors de l\'enregistrement.', 'Erreur');
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe(result => {
      this.saving = false;
      if (!result) return;
      this.toastr.success(
        this.isEditMode ? 'Grille modifiée.' : 'Grille créée.',
        'Succès',
      );
      this.router.navigate(['/admin/rh/developpement-rh/evaluations/grilles']);
    });
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/developpement-rh/evaluations/grilles']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
