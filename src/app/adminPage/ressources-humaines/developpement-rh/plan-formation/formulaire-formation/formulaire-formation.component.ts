import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../services/formation.service';
import { Formation } from '../../../../../models/formation.model';

@Component({
  selector: 'app-formulaire-formation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-formation.component.html',
  styleUrl: './formulaire-formation.component.scss',
})
export class FormulaireFormationComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isEditMode = false;
  formationId: string | null = null;
  loading = false;
  saving = false;
  competenceInput = '';
  competences: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private formationService: FormationService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.formationId = this.route.snapshot.paramMap.get('id');
    if (this.formationId) {
      this.isEditMode = true;
      this.loadFormation(this.formationId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      dureeHeures: [1, [Validators.required, Validators.min(1)]],
      typeFormateur: ['INTERNE', Validators.required],
      formateurNom: ['', Validators.required],
      coutFcfa: [0, [Validators.required, Validators.min(0)]],
      actif: [true],
    });
  }

  private loadFormation(id: string): void {
    this.loading = true;
    this.formationService.getById(id).pipe(
      catchError(() => { this.toastr.error('Impossible de charger la formation.', 'Erreur'); this.router.navigate(['/admin/rh/developpement-rh/formations']); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(f => {
      this.loading = false;
      if (!f) return;
      this.form.patchValue({ titre: f.titre, description: f.description, dureeHeures: f.dureeHeures, typeFormateur: f.typeFormateur, formateurNom: f.formateurNom, coutFcfa: f.coutFcfa, actif: f.actif });
      this.competences = [...f.competencesVisees];
    });
  }

  ajouterCompetence(): void {
    const c = this.competenceInput.trim();
    if (c && !this.competences.includes(c)) {
      this.competences.push(c);
    }
    this.competenceInput = '';
  }

  retirerCompetence(index: number): void {
    this.competences.splice(index, 1);
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const formation: Formation = { ...this.form.value, competencesVisees: this.competences };
    const obs$ = this.isEditMode ? this.formationService.modifier(this.formationId!, formation) : this.formationService.creer(formation);
    obs$.pipe(
      catchError(() => { this.toastr.error('Erreur lors de l\'enregistrement.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      this.saving = false;
      if (!r) return;
      this.toastr.success(this.isEditMode ? 'Formation modifiée.' : 'Formation créée.', 'Succès');
      this.router.navigate(['/admin/rh/developpement-rh/formations']);
    });
  }

  annuler(): void { this.router.navigate(['/admin/rh/developpement-rh/formations']); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
