import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PARAMETRES_CONGES_DEFAUT, ParametresConges, paliersTries } from '../../../../../models/parametres-conges.model';

/**
 * Note explicative sous un bloc de solde : d'où sortent les jours acquis.
 *
 * ⚠ **Point unique de vérité de cette phrase.** Elle était recopiée dans cinq
 * templates ; elle dépend désormais du barème modifiable par la RH, si bien qu'une
 * sixième copie divergerait au premier changement de paramétrage. Même parti pris que
 * `LIBELLES_JOURS_TRAVAIL`, centralisé à côté de son type.
 *
 * Le barème absent (appel en vol, backend antérieur) retombe sur le barème légal :
 * une note approximative vaut mieux qu'un bloc de solde sans explication.
 */
@Component({
  selector: 'app-note-bareme-conges',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mt-3 text-xs text-gray-500 leading-relaxed">
      Acquis = {{ b.joursAcquisParMois }} jours ouvrables par mois de service effectif<span
        *ngIf="mentionEnfants || mentionAnciennete">,</span>
      <ng-container *ngIf="mentionEnfants"> {{ mentionEnfants }}</ng-container><span
        *ngIf="mentionEnfants && mentionAnciennete"> et</span><ng-container
        *ngIf="mentionAnciennete"> {{ mentionAnciennete }}</ng-container>.
      « Antérieur » est le reliquat des exercices précédents, déjà inclus dans le solde.
      Seuls les congés annuels sont décomptés du solde.
    </p>
  `,
})
export class NoteBaremeCongesComponent {

  @Input() bareme: ParametresConges | null = null;

  get b(): ParametresConges {
    return this.bareme ?? PARAMETRES_CONGES_DEFAUT;
  }

  /** « + 1 jour par enfant de moins de 14 ans pour les mères de famille ». */
  get mentionEnfants(): string {
    const b = this.b;
    if (!b.supplementEnfantsActif || b.joursParEnfant <= 0) return '';
    const jours = b.joursParEnfant === 1 ? '+ 1 jour' : `+ ${b.joursParEnfant} jours`;
    const beneficiaires = b.reserverAuxMeres ? 'pour les mères de famille' : 'par parent';
    const plafond = b.plafondJoursEnfants ? ` (dans la limite de ${b.plafondJoursEnfants} j)` : '';
    return `${jours} par enfant de moins de ${b.ageMaxEnfant} ans ${beneficiaires}${plafond}`;
  }

  /** « + 1 à 6 jours selon l'ancienneté (à partir de 10 ans) ». */
  get mentionAnciennete(): string {
    const paliers = paliersTries(this.b);
    if (!this.b.supplementAncienneteActif || paliers.length === 0) return '';
    const premier = paliers[0];
    const max = Math.max(...paliers.map(p => p.joursSupplementaires));
    // Paliers NON cumulatifs : on annonce la fourchette, pas une somme.
    const fourchette = premier.joursSupplementaires === max
      ? `+ ${max} j`
      : `+ ${premier.joursSupplementaires} à ${max} j`;
    return `${fourchette} selon l'ancienneté (à partir de ${premier.anneesAnciennete} ans)`;
  }
}
