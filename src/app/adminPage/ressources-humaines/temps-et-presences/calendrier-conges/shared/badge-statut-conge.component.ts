import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  COULEURS_STATUT_DEMANDE,
  LIBELLES_STATUT_DEMANDE,
} from '../../../../../constants/conges.constants';
import { StatutDemande } from '../../../../../models/conge.model';

/**
 * Badge de statut d'une demande de congé.
 * Remplace les maps `getStatutLabel` / `getStatutClasses` autrefois dupliquées
 * dans `calendrier-conges` et `validation-conges`.
 */
@Component({
  selector: 'app-badge-statut-conge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          [ngClass]="couleur">
      {{ libelle }}
    </span>
  `,
})
export class BadgeStatutCongeComponent {

  @Input({ required: true }) statut!: StatutDemande;

  get libelle(): string {
    return LIBELLES_STATUT_DEMANDE[this.statut] ?? this.statut;
  }

  get couleur(): string {
    return COULEURS_STATUT_DEMANDE[this.statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }
}
