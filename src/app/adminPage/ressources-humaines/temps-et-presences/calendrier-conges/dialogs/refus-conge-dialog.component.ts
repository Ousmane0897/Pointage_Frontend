import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';

import { LIBELLES_NIVEAU, PARAMETRES_CONGES } from '../../../../../constants/conges.constants';
import { NiveauValidation } from '../../../../../models/conge.model';

/**
 * Dialog de refus d'une demande de congé — le motif est obligatoire.
 *
 * Renvoie `{ motif }` ou `null` si l'utilisateur renonce. Remplace le
 * `window.prompt` de l'ancienne file de validation. Le seuil de longueur est
 * plus strict que celui du dialog d'annulation d'affectation : ce motif est
 * envoyé par e-mail au demandeur.
 */
export interface RefusCongeDialogResult {
  motif: string;
}

export interface RefusCongeDialogData {
  employeNom?: string;
  periode?: string;
  nombreJours?: number;
  niveau?: NiveauValidation;
}

@Component({
  selector: 'app-refus-conge-dialog',
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
      <lucide-icon name="XCircle" class="h-5 w-5 text-red-600"></lucide-icon>
      Refuser la demande de congé
    </h2>
    <div mat-dialog-content class="space-y-3 pt-2">
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <p>
          Employé :
          <span class="font-medium text-slate-900">{{ data.employeNom || 'Non renseigné' }}</span>
        </p>
        <p *ngIf="data.periode">
          Période : <span class="font-medium text-slate-900">{{ data.periode }}</span>
          <span *ngIf="data.nombreJours"> ({{ data.nombreJours }} j)</span>
        </p>
        <p *ngIf="data.niveau">
          Niveau : <span class="font-medium text-slate-900">{{ libelleNiveau }}</span>
        </p>
      </div>
      <p class="text-sm text-slate-600">
        Le refus est <span class="font-medium text-slate-900">définitif</span> : la demande ne
        poursuivra pas le circuit. Le motif est transmis au demandeur par e-mail.
      </p>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">
          Motif du refus <span class="text-red-500">*</span>
        </label>
        <textarea [formControl]="motifCtrl" rows="3"
                  [attr.maxlength]="MAX_LENGTH"
                  placeholder="Expliquez la raison du refus…"
                  class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"></textarea>
        <div class="mt-1 flex items-start justify-between gap-2">
          <p *ngIf="motifCtrl.touched && motifCtrl.invalid" class="text-xs text-red-600">
            Le motif est obligatoire ({{ MOTIF_MIN_LENGTH }} caractères minimum).
          </p>
          <span class="ml-auto text-xs text-slate-400">
            {{ motifCtrl.value.length }}/{{ MAX_LENGTH }}
          </span>
        </div>
      </div>
    </div>
    <div mat-dialog-actions class="justify-end gap-2">
      <button type="button" (click)="fermer()"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Retour
      </button>
      <button type="button" (click)="confirmer()" [disabled]="motifCtrl.invalid"
              class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
        <lucide-icon name="XCircle" class="h-4 w-4"></lucide-icon>
        Confirmer le refus
      </button>
    </div>
  `,
})
export class RefusCongeDialogComponent {

  readonly MOTIF_MIN_LENGTH = PARAMETRES_CONGES.motifRefusMinLength;
  readonly MAX_LENGTH = PARAMETRES_CONGES.commentaireMaxLength;

  motifCtrl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(PARAMETRES_CONGES.motifRefusMinLength)],
  });

  constructor(
    public dialogRef: MatDialogRef<RefusCongeDialogComponent, RefusCongeDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: RefusCongeDialogData,
  ) {}

  get libelleNiveau(): string {
    return this.data.niveau ? LIBELLES_NIVEAU[this.data.niveau] : '';
  }

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
