import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, switchMap, takeUntil } from 'rxjs';

import { SanctionService } from '../../../../../services/sanction.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  Sanction,
  TypeSanction,
  LIBELLES_TYPE_SANCTION,
} from '../../../../../models/sanction.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

@Component({
  selector: 'app-formulaire-sanction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-sanction.component.html',
  styleUrl: './formulaire-sanction.component.scss',
})
export class FormulaireSanctionComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  employes: DossierEmploye[] = [];
  isEditMode = false;
  sanctionId: string | null = null;
  loading = false;
  saving = false;
  fichiers: File[] = [];

  typesSanction = Object.entries(LIBELLES_TYPE_SANCTION).map(([value, label]) => ({ value, label }));

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private sanctionService: SanctionService,
    private dossierService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadEmployes();

    this.sanctionId = this.route.snapshot.paramMap.get('id');
    if (this.sanctionId) {
      this.isEditMode = true;
      this.loadSanction(this.sanctionId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      employeId: ['', Validators.required],
      type: ['', Validators.required],
      motif: ['', [Validators.required, Validators.minLength(10)]],
      description: [''],
      dateFaits: ['', Validators.required],
      dateSanction: ['', Validators.required],
      dateConvocation: [''],
      dateEntretien: [''],
      dateNotification: [''],
      dureeMiseAPied: [null],
      commentaire: [''],
    });

    // Validation conditionnelle : durée obligatoire pour mise à pied
    this.form.get('type')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(type => {
      const dureeCtrl = this.form.get('dureeMiseAPied')!;
      if (type === 'MISE_A_PIED') {
        dureeCtrl.setValidators([Validators.required, Validators.min(1), Validators.max(8)]);
      } else {
        dureeCtrl.clearValidators();
        dureeCtrl.setValue(null);
      }
      dureeCtrl.updateValueAndValidity();
    });
  }

  private loadEmployes(): void {
    this.dossierService
      .getEmployes(0, 200)
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => (this.employes = res.content));
  }

  private loadSanction(id: string): void {
    this.loading = true;
    this.sanctionService
      .getById(id)
      .pipe(
        catchError(err => {
          this.toastr.error('Impossible de charger la sanction.', 'Erreur');
          this.router.navigate(['/admin/rh/developpement-rh/sanctions']);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(s => {
        this.loading = false;
        if (!s) return;
        this.form.patchValue({
          employeId: s.employeId,
          type: s.type,
          motif: s.motif,
          description: s.description ?? '',
          dateFaits: s.dateFaits,
          dateSanction: s.dateSanction,
          dateConvocation: s.dateConvocation ?? '',
          dateEntretien: s.dateEntretien ?? '',
          dateNotification: s.dateNotification ?? '',
          dureeMiseAPied: s.dureeMiseAPied ?? null,
          commentaire: s.commentaire ?? '',
        });
      });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.fichiers = Array.from(input.files);
    }
  }

  /**
   * Vérifie le délai minimum de 3 jours ouvrés entre convocation et entretien.
   */
  get delaiConvocationValide(): boolean {
    const conv = this.form.get('dateConvocation')?.value;
    const ent = this.form.get('dateEntretien')?.value;
    if (!conv || !ent) return true;
    const diffMs = new Date(ent).getTime() - new Date(conv).getTime();
    const diffJours = diffMs / (1000 * 60 * 60 * 24);
    return diffJours >= 3;
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.delaiConvocationValide) {
      this.toastr.warning('Le délai entre convocation et entretien doit être d\'au moins 3 jours.', 'Procédure');
      return;
    }

    this.saving = true;
    const formData = this.buildFormData();

    const obs$ = this.isEditMode
      ? this.sanctionService.modifier(this.sanctionId!, formData)
      : this.sanctionService.creer(formData);

    obs$.pipe(
      catchError(err => {
        this.toastr.error('Erreur lors de l\'enregistrement.', 'Erreur');
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe(result => {
      this.saving = false;
      if (!result) return;
      this.toastr.success(
        this.isEditMode ? 'Sanction modifiée.' : 'Sanction créée.',
        'Succès',
      );
      this.router.navigate(['/admin/rh/developpement-rh/sanctions']);
    });
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.value;
    fd.append('employeId', v.employeId);
    fd.append('type', v.type);
    fd.append('motif', v.motif);
    if (v.description) fd.append('description', v.description);
    fd.append('dateFaits', v.dateFaits);
    fd.append('dateSanction', v.dateSanction);
    if (v.dateConvocation) fd.append('dateConvocation', v.dateConvocation);
    if (v.dateEntretien) fd.append('dateEntretien', v.dateEntretien);
    if (v.dateNotification) fd.append('dateNotification', v.dateNotification);
    if (v.dureeMiseAPied) fd.append('dureeMiseAPied', v.dureeMiseAPied);
    if (v.commentaire) fd.append('commentaire', v.commentaire);
    this.fichiers.forEach(f => fd.append('piecesJointes', f));
    return fd;
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/developpement-rh/sanctions']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
