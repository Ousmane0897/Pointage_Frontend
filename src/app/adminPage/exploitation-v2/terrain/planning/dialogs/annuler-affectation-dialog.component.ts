import {
  ChangeDetectionStrategy,
  Component,
  Inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Dialog d'annulation d'une affectation — le motif est obligatoire.
 *
 * Renvoie `{ motif }` ou `null` si l'utilisateur renonce.
 */
export interface AnnulerAffectationDialogResult {
  motif: string;
}

export interface AnnulerAffectationDialogData {
  employeNom?: string;
  siteNom?: string;
  creneau?: string;
}

/** Longueur minimale du motif d'annulation. */
const MOTIF_MIN_LENGTH = 5;

@Component({
  selector: 'app-annuler-affectation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    LucideAngularModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2 text-lg font-semibold text-slate-900">
      <lucide-icon name="CircleX" class="h-5 w-5 text-amber-600"></lucide-icon>
      Annuler l'affectation
    </h2>
    <div mat-dialog-content class="space-y-3 pt-2">
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <p>
          Agent :
          <span class="font-medium text-slate-900">{{ data.employeNom || 'Non renseigné' }}</span>
        </p>
        <p>
          Site :
          <span class="font-medium text-slate-900">{{ data.siteNom || 'Non renseigné' }}</span>
        </p>
        <p *ngIf="data.creneau">
          Créneau : <span class="font-medium text-slate-900">{{ data.creneau }}</span>
        </p>
      </div>
      <p class="text-sm text-slate-600">
        L'affectation est conservée dans l'historique avec le statut
        <span class="font-medium text-slate-900">Annulée</span>.
      </p>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">
          Motif de l'annulation <span class="text-red-500">*</span>
        </label>
        <textarea [formControl]="motifCtrl" rows="3"
                  placeholder="Expliquez la raison de l'annulation…"
                  class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"></textarea>
        <p *ngIf="motifCtrl.touched && motifCtrl.invalid" class="mt-1 text-xs text-red-600">
          Le motif est obligatoire ({{ MOTIF_MIN_LENGTH }} caractères minimum).
        </p>
      </div>
    </div>
    <div mat-dialog-actions class="justify-end gap-2">
      <button type="button" (click)="fermer()"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Retour
      </button>
      <button type="button" (click)="confirmer()" [disabled]="motifCtrl.invalid"
              class="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">
        <lucide-icon name="CircleX" class="h-4 w-4"></lucide-icon>
        Confirmer l'annulation
      </button>
    </div>
  `,
})
export class AnnulerAffectationDialogComponent {

  readonly MOTIF_MIN_LENGTH = MOTIF_MIN_LENGTH;

  motifCtrl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(MOTIF_MIN_LENGTH)],
  });

  constructor(
    public dialogRef: MatDialogRef<
      AnnulerAffectationDialogComponent,
      AnnulerAffectationDialogResult | null
    >,
    @Inject(MAT_DIALOG_DATA) public data: AnnulerAffectationDialogData,
  ) {}

  fermer(): void {
    this.dialogRef.close(null);
  }

  confirmer(): void {
    if (this.motifCtrl.invalid) {
      this.motifCtrl.markAsTouched();
      return;
    }
    this.dialogRef.close({ motif: this.motifCtrl.value.trim() });
  }
}
