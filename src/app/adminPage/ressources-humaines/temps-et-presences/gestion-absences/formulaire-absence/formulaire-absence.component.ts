import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { AbsenceService } from '../../../../../services/absence.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { Absence } from '../../../../../models/absence.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

@Component({
  selector: 'app-formulaire-absence',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-absence.component.html',
  styleUrl: './formulaire-absence.component.scss',
})
export class FormulaireAbsenceComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  employes: DossierEmploye[] = [];
  selectedFile: File | null = null;
  dragOver = false;

  isEdit = false;
  absenceId: string | null = null;
  loading = false;
  submitting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private absenceService: AbsenceService,
    private dossierService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadEmployes();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.absenceId = id;
      this.loadAbsence(id);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      employeId: ['', Validators.required],
      type: ['', Validators.required],
      typeAutrePrecision: [''],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      motif: [''],
    });

    // Validator dynamique : typeAutrePrecision requis si type = AUTRE
    this.form.get('type')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type: string) => {
        const ctrl = this.form.get('typeAutrePrecision')!;
        if (type === 'AUTRE') {
          ctrl.setValidators([Validators.required, Validators.maxLength(200)]);
        } else {
          ctrl.clearValidators();
          ctrl.setValue('', { emitEvent: false });
        }
        ctrl.updateValueAndValidity();
      });
  }

  private loadEmployes(): void {
    this.dossierService.getEmployes(0, 500)
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => (this.employes = res.content));
  }

  private loadAbsence(id: string): void {
    this.loading = true;
    this.absenceService.getById(id).pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      finalize(() => (this.loading = false)),
      takeUntil(this.destroy$),
    ).subscribe(a => {
      if (!a) return;
      this.form.patchValue({
        employeId: a.employeId,
        type: a.type,
        typeAutrePrecision: a.typeAutrePrecision ?? '',
        dateDebut: a.dateDebut,
        dateFin: a.dateFin,
        motif: a.motif ?? '',
      });
    });
  }

  // ─── Upload ──────────────────────────────────────────────────────────────
  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files && input.files[0]) this.selectedFile = input.files[0];
  }
  onDragOver(ev: DragEvent): void { ev.preventDefault(); this.dragOver = true; }
  onDragLeave(): void { this.dragOver = false; }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragOver = false;
    if (ev.dataTransfer?.files && ev.dataTransfer.files[0]) this.selectedFile = ev.dataTransfer.files[0];
  }
  retirerFichier(): void { this.selectedFile = null; }

  // ─── Submit ──────────────────────────────────────────────────────────────
  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez remplir tous les champs obligatoires.', 'Formulaire incomplet');
      return;
    }

    if (this.form.value.dateFin < this.form.value.dateDebut) {
      this.toastr.warning('La date de fin doit être après la date de début.', 'Dates invalides');
      return;
    }

    const v = this.form.value;
    const fd = new FormData();
    fd.append('employeId', v.employeId);
    fd.append('type', v.type);
    if (v.type === 'AUTRE' && v.typeAutrePrecision) {
      fd.append('typeAutrePrecision', v.typeAutrePrecision);
    }
    fd.append('dateDebut', v.dateDebut);
    fd.append('dateFin', v.dateFin);
    if (v.motif) fd.append('motif', v.motif);
    if (this.selectedFile) fd.append('fichier', this.selectedFile);

    this.submitting = true;
    const req$ = this.isEdit && this.absenceId
      ? this.absenceService.modifier(this.absenceId, fd)
      : this.absenceService.creer(fd);

    req$.pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      finalize(() => (this.submitting = false)),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      if (!res) return;
      this.toastr.success(this.isEdit ? 'Absence modifiée.' : 'Absence déclarée.', 'Succès');
      this.router.navigate(['/admin/rh/temps-et-presences/absences']);
    });
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/absences']);
  }

  formatFileSize(b: number): string {
    if (b < 1024) return `${b} o`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
    return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
  }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
