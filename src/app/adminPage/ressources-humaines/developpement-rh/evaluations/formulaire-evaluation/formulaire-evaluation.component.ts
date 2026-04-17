import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, switchMap, forkJoin, takeUntil } from 'rxjs';

import { EvaluationService } from '../../../../../services/evaluation.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { FormationService } from '../../../../../services/formation.service';
import {
  EvaluationPeriodique,
  GrilleEvaluation,
  CritereEvaluation,
  NoteEvaluation,
  StatutEvaluation,
  TypeNotation,
  LIBELLES_STATUT_EVALUATION,
  LIBELLES_CATEGORIE_CRITERE,
} from '../../../../../models/evaluation.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { BesoinFormation } from '../../../../../models/formation.model';

@Component({
  selector: 'app-formulaire-evaluation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-evaluation.component.html',
  styleUrl: './formulaire-evaluation.component.scss',
})
export class FormulaireEvaluationComponent implements OnInit, OnDestroy {

  // ─── State ───────────────────────────────────────────────────────
  evaluationId: string | null = null;
  evaluation: EvaluationPeriodique | null = null;
  grille: GrilleEvaluation | null = null;
  loading = false;
  saving = false;

  // Current step based on statut
  step: 'CREATION' | 'AUTO_EVALUATION' | 'EVALUATION_MANAGER' | 'VALIDE' = 'CREATION';

  // Reference data
  employes: DossierEmploye[] = [];
  grilles: GrilleEvaluation[] = [];

  // ─── Forms ───────────────────────────────────────────────────────
  createForm!: FormGroup;
  autoEvalForm!: FormGroup;
  managerEvalForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private evaluationService: EvaluationService,
    private dossierService: DossierEmployeService,
    private formationService: FormationService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.evaluationId = this.route.snapshot.paramMap.get('id');

    if (this.evaluationId) {
      this.loadEvaluation(this.evaluationId);
    } else {
      this.step = 'CREATION';
      this.loadReferenceData();
    }
  }

  private initForms(): void {
    this.createForm = this.fb.group({
      employeId: ['', Validators.required],
      grilleId: ['', Validators.required],
      periode: ['', Validators.required],
      typeNotation: ['NUMERIQUE', Validators.required],
    });

    this.autoEvalForm = this.fb.group({
      notes: this.fb.array([]),
      commentaire: [''],
    });

    this.managerEvalForm = this.fb.group({
      notes: this.fb.array([]),
      commentaire: [''],
      objectifs: [''],
    });

    // When grille is selected, load its critères
    this.createForm.get('grilleId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(grilleId => {
        if (grilleId) this.loadGrille(grilleId);
      });
  }

  private loadReferenceData(): void {
    forkJoin({
      employes: this.dossierService.getEmployes(0, 200).pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
      ),
      grilles: this.evaluationService.listerGrilles(0, 100).pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<GrilleEvaluation>)),
      ),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(res => {
      this.employes = res.employes.content;
      this.grilles = res.grilles.content.filter(g => g.actif);
    });
  }

  private loadEvaluation(id: string): void {
    this.loading = true;
    this.evaluationService
      .getEvaluationById(id)
      .pipe(
        catchError(() => {
          this.toastr.error('Impossible de charger l\'évaluation.', 'Erreur');
          this.router.navigate(['/admin/rh/developpement-rh/evaluations']);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(ev => {
        this.loading = false;
        if (!ev) return;
        this.evaluation = ev;
        this.step = this.mapStatutToStep(ev.statut);

        // Load grille for criteria
        if (ev.grilleId) {
          this.loadGrille(ev.grilleId, ev);
        }
      });
  }

  private loadGrille(grilleId: string, evaluation?: EvaluationPeriodique): void {
    this.evaluationService
      .getGrilleById(grilleId)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(g => {
        if (!g) return;
        this.grille = g;
        if (evaluation) {
          this.buildNotesForms(g.criteres, evaluation);
        }
      });
  }

  private mapStatutToStep(statut: StatutEvaluation): 'CREATION' | 'AUTO_EVALUATION' | 'EVALUATION_MANAGER' | 'VALIDE' {
    switch (statut) {
      case 'BROUILLON': return 'AUTO_EVALUATION';
      case 'AUTO_EVALUATION': return 'EVALUATION_MANAGER';
      case 'EVALUATION_MANAGER':
      case 'VALIDE': return 'VALIDE';
      default: return 'CREATION';
    }
  }

  private buildNotesForms(criteres: CritereEvaluation[], evaluation: EvaluationPeriodique): void {
    // Build auto-eval notes
    const autoNotes = this.autoEvalForm.get('notes') as FormArray;
    autoNotes.clear();
    criteres.forEach(c => {
      const existingNote = evaluation.notesAutoEvaluation?.find(n => n.critereCode === c.code);
      autoNotes.push(this.fb.group({
        critereCode: [c.code],
        critereLibelle: [c.libelle],
        poids: [c.poids],
        categorie: [c.categorie],
        note: [existingNote?.note ?? null, [Validators.required, Validators.min(1), Validators.max(5)]],
        commentaire: [existingNote?.commentaire ?? ''],
      }));
    });
    this.autoEvalForm.patchValue({ commentaire: evaluation.commentaireEmploye ?? '' });

    // Build manager notes
    const managerNotes = this.managerEvalForm.get('notes') as FormArray;
    managerNotes.clear();
    criteres.forEach(c => {
      const existingNote = evaluation.notesManager?.find(n => n.critereCode === c.code);
      managerNotes.push(this.fb.group({
        critereCode: [c.code],
        critereLibelle: [c.libelle],
        poids: [c.poids],
        categorie: [c.categorie],
        note: [existingNote?.note ?? null, [Validators.required, Validators.min(1), Validators.max(5)]],
        commentaire: [existingNote?.commentaire ?? ''],
      }));
    });
    this.managerEvalForm.patchValue({
      commentaire: evaluation.commentaireManager ?? '',
      objectifs: evaluation.objectifsPeriodeSuivante ?? '',
    });
  }

  // ─── Computed ────────────────────────────────────────────────────

  get autoEvalNotes(): FormArray {
    return this.autoEvalForm.get('notes') as FormArray;
  }

  get managerNotes(): FormArray {
    return this.managerEvalForm.get('notes') as FormArray;
  }

  get noteGlobaleAutoEval(): number | null {
    return this.computeWeightedAverage(this.autoEvalNotes);
  }

  get noteGlobaleManager(): number | null {
    return this.computeWeightedAverage(this.managerNotes);
  }

  private computeWeightedAverage(notesArray: FormArray): number | null {
    if (notesArray.length === 0) return null;
    let totalPoids = 0;
    let totalWeighted = 0;
    let hasNotes = false;

    for (const ctrl of notesArray.controls) {
      const note = ctrl.get('note')?.value;
      const poids = ctrl.get('poids')?.value ?? 0;
      if (note != null && note > 0) {
        hasNotes = true;
        totalWeighted += note * poids;
        totalPoids += poids;
      }
    }
    if (!hasNotes || totalPoids === 0) return null;
    return totalWeighted / totalPoids;
  }

  getCategorieLabel(cat: string): string {
    return LIBELLES_CATEGORIE_CRITERE[cat as keyof typeof LIBELLES_CATEGORIE_CRITERE] ?? cat;
  }

  getStatutLabel(s: StatutEvaluation): string {
    return LIBELLES_STATUT_EVALUATION[s] ?? s;
  }

  // ─── Actions ─────────────────────────────────────────────────────

  creerEvaluation(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const val = this.createForm.value;
    const evaluation: EvaluationPeriodique = {
      employeId: val.employeId,
      grilleId: val.grilleId,
      periode: val.periode,
      typeNotation: val.typeNotation,
      statut: 'BROUILLON',
      notesAutoEvaluation: [],
      notesManager: [],
    };

    this.evaluationService.creerEvaluation(evaluation)
      .pipe(
        catchError(() => {
          this.toastr.error('Erreur lors de la création.', 'Erreur');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        this.saving = false;
        if (!result) return;
        this.toastr.success('Évaluation créée avec succès.', 'Succès');
        this.router.navigate(['/admin/rh/developpement-rh/evaluations', result.id]);
      });
  }

  soumettreAutoEvaluation(): void {
    if (this.autoEvalForm.invalid) {
      this.autoEvalForm.markAllAsTouched();
      this.toastr.warning('Veuillez noter tous les critères.', 'Formulaire incomplet');
      return;
    }

    this.saving = true;
    const notes: NoteEvaluation[] = this.autoEvalNotes.controls.map(c => ({
      critereCode: c.get('critereCode')?.value,
      note: c.get('note')?.value,
      commentaire: c.get('commentaire')?.value || undefined,
    }));

    this.evaluationService
      .soumettreAutoEvaluation(this.evaluationId!, notes, this.autoEvalForm.get('commentaire')?.value ?? '')
      .pipe(
        catchError(() => {
          this.toastr.error('Erreur lors de la soumission.', 'Erreur');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        this.saving = false;
        if (!result) return;
        this.toastr.success('Auto-évaluation soumise.', 'Succès');
        this.evaluation = result;
        this.step = 'EVALUATION_MANAGER';
      });
  }

  soumettreEvaluationManager(): void {
    if (this.managerEvalForm.invalid) {
      this.managerEvalForm.markAllAsTouched();
      this.toastr.warning('Veuillez noter tous les critères.', 'Formulaire incomplet');
      return;
    }

    this.saving = true;
    const notes: NoteEvaluation[] = this.managerNotes.controls.map(c => ({
      critereCode: c.get('critereCode')?.value,
      note: c.get('note')?.value,
      commentaire: c.get('commentaire')?.value || undefined,
    }));

    this.evaluationService
      .soumettreEvaluationManager(
        this.evaluationId!,
        notes,
        this.managerEvalForm.get('commentaire')?.value ?? '',
        this.managerEvalForm.get('objectifs')?.value ?? '',
      )
      .pipe(
        catchError(() => {
          this.toastr.error('Erreur lors de la soumission.', 'Erreur');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        this.saving = false;
        if (!result) return;
        this.toastr.success('Évaluation manager soumise.', 'Succès');
        this.evaluation = result;
        this.step = 'VALIDE';
      });
  }

  validerEvaluation(): void {
    if (!this.evaluationId) return;
    this.saving = true;

    this.evaluationService.validerEvaluation(this.evaluationId)
      .pipe(
        catchError(() => {
          this.toastr.error('Erreur lors de la validation.', 'Erreur');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        this.saving = false;
        if (!result) return;
        this.toastr.success('Évaluation validée.', 'Succès');
        this.evaluation = result;
      });
  }

  genererBesoinFormation(): void {
    if (!this.evaluation) return;

    // Identify weak criteria (note < 3) from manager notes
    const lacunes = this.managerNotes.controls
      .filter(c => (c.get('note')?.value ?? 0) < 3)
      .map(c => c.get('critereLibelle')?.value);

    if (lacunes.length === 0) {
      this.toastr.info('Aucune lacune identifiée (toutes les notes >= 3).', 'Information');
      return;
    }

    const besoin: BesoinFormation = {
      employeId: this.evaluation.employeId,
      nom: this.evaluation.nom,
      prenom: this.evaluation.prenom,
      departement: this.evaluation.departement,
      competencesRequises: lacunes,
      source: 'EVALUATION',
      sourceId: this.evaluation.id,
      commentaire: `Lacunes identifiées lors de l'évaluation ${this.evaluation.periode} : ${lacunes.join(', ')}`,
    } as any;

    this.formationService.creerBesoin(besoin)
      .pipe(
        catchError(() => {
          this.toastr.error('Erreur lors de la création du besoin de formation.', 'Erreur');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        if (!result) return;
        this.toastr.success('Besoin de formation créé avec succès.', 'Succès');
      });
  }

  retour(): void {
    this.router.navigate(['/admin/rh/developpement-rh/evaluations']);
  }

  // ─── Note display helpers ────────────────────────────────────────

  getNoteColor(note: number): string {
    if (note >= 4) return 'text-green-600';
    if (note >= 3) return 'text-blue-600';
    if (note >= 2) return 'text-amber-600';
    return 'text-red-600';
  }

  getAutoEvalNoteForCritere(code: string): number | null {
    const note = this.evaluation?.notesAutoEvaluation?.find(n => n.critereCode === code);
    return note?.note ?? null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
