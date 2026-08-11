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
 * Suppression définitive d'un document de stock déjà engagé (inventaire clôturé, bon effectif) —
 * réservée au super-administrateur.
 *
 * Le `ConfirmDialogComponent` habituel ne convient pas : le motif est obligatoire et journalisé
 * côté serveur, il faut donc le saisir ici. Renvoie `{ motif }` ou `null` si l'utilisateur renonce.
 */
export interface SuppressionDefinitiveDialogResult {
  motif: string;
}

export interface SuppressionDefinitiveDialogData {
  /** Ex. « Supprimer l'inventaire clôturé », « Supprimer le bon de sortie ». */
  titre: string;
  /** Référence du document, affichée telle quelle. */
  reference?: string;
  /** Effet stock annoncé à l'utilisateur (il n'est pas devinable depuis l'écran). */
  effetStock?: string;
  /**
   * Bon d'entrée : le coût unitaire courant (CUMP) n'est pas recalculé en arrière par le serveur.
   * À signaler, sans quoi l'écart de valorisation resterait inexpliqué.
   */
  avertissementCump?: boolean;
}

/** Longueur minimale du motif — le serveur applique la même règle. */
const MOTIF_MIN_LENGTH = 10;

@Component({
  selector: 'app-suppression-definitive-dialog',
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
      <lucide-icon name="TriangleAlert" class="h-5 w-5 text-red-600"></lucide-icon>
      {{ data.titre }}
    </h2>
    <div mat-dialog-content class="space-y-3 pt-2">
      <div *ngIf="data.reference"
           class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Document : <span class="font-mono font-medium text-slate-900">{{ data.reference }}</span>
      </div>

      <ul class="space-y-1.5 text-sm text-slate-600">
        <li *ngIf="data.effetStock" class="flex items-start gap-2">
          <lucide-icon name="Undo2" class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"></lucide-icon>
          <span>{{ data.effetStock }}</span>
        </li>
        <li class="flex items-start gap-2">
          <lucide-icon name="Trash2" class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"></lucide-icon>
          <span>Le document et ses mouvements de stock sont <span class="font-medium text-slate-900">définitivement effacés</span>.</span>
        </li>
        <li *ngIf="data.avertissementCump" class="flex items-start gap-2">
          <lucide-icon name="TriangleAlert" class="mt-0.5 h-4 w-4 shrink-0 text-amber-500"></lucide-icon>
          <span>Le <span class="font-medium text-slate-900">coût unitaire courant du produit n'est pas recalculé</span> en arrière : à vérifier depuis la valorisation financière.</span>
        </li>
        <li class="flex items-start gap-2">
          <lucide-icon name="FileText" class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"></lucide-icon>
          <span>L'opération est journalisée (auteur, date, motif).</span>
        </li>
      </ul>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">
          Motif de la suppression <span class="text-red-500">*</span>
        </label>
        <textarea [formControl]="motifCtrl" rows="3"
                  placeholder="Expliquez pourquoi ce document doit être supprimé…"
                  class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"></textarea>
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
              class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
        <lucide-icon name="Trash2" class="h-4 w-4"></lucide-icon>
        Supprimer définitivement
      </button>
    </div>
  `,
})
export class SuppressionDefinitiveDialogComponent {

  readonly MOTIF_MIN_LENGTH = MOTIF_MIN_LENGTH;

  motifCtrl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(MOTIF_MIN_LENGTH)],
  });

  constructor(
    public dialogRef: MatDialogRef<
      SuppressionDefinitiveDialogComponent,
      SuppressionDefinitiveDialogResult | null
    >,
    @Inject(MAT_DIALOG_DATA) public data: SuppressionDefinitiveDialogData,
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
