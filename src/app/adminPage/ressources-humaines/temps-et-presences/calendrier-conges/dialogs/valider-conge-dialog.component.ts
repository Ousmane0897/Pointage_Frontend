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
 * Dialog de validation d'une demande de congé — commentaire **facultatif**.
 *
 * Remplace le `ConfirmDialogComponent` générique : l'API accepte un commentaire
 * de décision qui n'était jamais transmis auparavant.
 * Renvoie `{ commentaire }` ou `null` si l'utilisateur renonce.
 */
export interface ValiderCongeDialogResult {
  commentaire?: string;
}

export interface ValiderCongeDialogData {
  employeNom?: string;
  periode?: string;
  nombreJours?: number;
  niveau?: NiveauValidation;
  /** true si cette validation clôt le circuit (niveau Direction générale). */
  derniereEtape?: boolean;
}

@Component({
  selector: 'app-valider-conge-dialog',
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
      <lucide-icon name="CheckCircle2" class="h-5 w-5 text-green-600"></lucide-icon>
      Valider la demande de congé
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
        <ng-container *ngIf="data.derniereEtape; else etapeIntermediaire">
          Cette validation <span class="font-medium text-slate-900">approuve définitivement</span>
          la demande et décompte les jours du solde.
        </ng-container>
        <ng-template #etapeIntermediaire>
          La demande passera au niveau suivant du circuit, qui en sera notifié par e-mail.
        </ng-template>
      </p>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">
          Commentaire <span class="text-slate-400">(facultatif)</span>
        </label>
        <textarea [formControl]="commentaireCtrl" rows="3"
                  [attr.maxlength]="MAX_LENGTH"
                  placeholder="Précisions éventuelles…"
                  class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"></textarea>
        <div class="mt-1 text-right text-xs text-slate-400">
          {{ commentaireCtrl.value.length }}/{{ MAX_LENGTH }}
        </div>
      </div>
    </div>
    <div mat-dialog-actions class="justify-end gap-2">
      <button type="button" (click)="fermer()"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Retour
      </button>
      <button type="button" (click)="confirmer()" [disabled]="commentaireCtrl.invalid"
              class="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
        <lucide-icon name="CheckCircle2" class="h-4 w-4"></lucide-icon>
        Confirmer la validation
      </button>
    </div>
  `,
})
export class ValiderCongeDialogComponent {

  readonly MAX_LENGTH = PARAMETRES_CONGES.commentaireMaxLength;

  commentaireCtrl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.maxLength(PARAMETRES_CONGES.commentaireMaxLength)],
  });

  constructor(
    public dialogRef: MatDialogRef<ValiderCongeDialogComponent, ValiderCongeDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: ValiderCongeDialogData,
  ) {}

  get libelleNiveau(): string {
    return this.data.niveau ? LIBELLES_NIVEAU[this.data.niveau] : '';
  }

  fermer(): void {
    this.dialogRef.close(null);
  }

  confirmer(): void {
    const commentaire = this.commentaireCtrl.value.trim();
    this.dialogRef.close({ commentaire: commentaire || undefined });
  }
}
