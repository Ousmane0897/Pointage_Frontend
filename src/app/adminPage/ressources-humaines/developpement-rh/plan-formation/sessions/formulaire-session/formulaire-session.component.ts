import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../../services/formation.service';
import { Formation, SessionFormation } from '../../../../../../models/formation.model';
import { PageResponse } from '../../../../../../models/pageResponse.model';

@Component({
  selector: 'app-formulaire-session',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-session.component.html',
  styleUrl: './formulaire-session.component.scss',
})
export class FormulaireSessionComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isEditMode = false;
  sessionId: string | null = null;
  loading = false;
  saving = false;
  formations: Formation[] = [];

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
    this.loadFormations();
    this.sessionId = this.route.snapshot.paramMap.get('id');
    if (this.sessionId) {
      this.isEditMode = true;
      this.loadSession(this.sessionId);
    } else {
      const formationId = this.route.snapshot.queryParamMap.get('formationId');
      if (formationId) {
        this.form.patchValue({ formationId });
      }
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      formationId: ['', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      lieu: ['', Validators.required],
      capaciteMax: [20, [Validators.required, Validators.min(1)]],
    });
  }

  private loadFormations(): void {
    this.formationService.lister(0, 200).pipe(
      catchError(() => of({ content: [], totalElements: 0 } as PageResponse<Formation>)),
      takeUntil(this.destroy$),
    ).subscribe(res => (this.formations = res.content));
  }

  private loadSession(id: string): void {
    this.loading = true;
    this.formationService.getSessionById(id).pipe(
      catchError(() => {
        this.toastr.error('Impossible de charger la session.', 'Erreur');
        this.router.navigate(['/admin/rh/developpement-rh/formations/sessions']);
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe(s => {
      this.loading = false;
      if (!s) return;
      this.form.patchValue({
        formationId: s.formationId,
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
        lieu: s.lieu,
        capaciteMax: s.capaciteMax,
      });
    });
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const session: SessionFormation = {
      ...this.form.value,
      statut: 'PLANIFIEE',
      participantsInscrits: 0,
    };
    const obs$ = this.isEditMode
      ? this.formationService.modifierSession(this.sessionId!, session)
      : this.formationService.creerSession(session);

    obs$.pipe(
      catchError(() => { this.toastr.error('Erreur lors de l\'enregistrement.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      this.saving = false;
      if (!r) return;
      this.toastr.success(this.isEditMode ? 'Session modifiée.' : 'Session créée.', 'Succès');
      this.router.navigate(['/admin/rh/developpement-rh/formations/sessions']);
    });
  }

  annuler(): void { this.router.navigate(['/admin/rh/developpement-rh/formations/sessions']); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
