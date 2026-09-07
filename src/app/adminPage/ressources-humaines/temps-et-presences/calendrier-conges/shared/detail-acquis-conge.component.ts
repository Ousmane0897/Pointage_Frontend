import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SoldeConge } from '../../../../../models/conge.model';

/**
 * Ventilation des jours acquis : base + majoration enfants + majoration ancienneté.
 *
 * Rendu compact (une ligne de puces), pour tenir aussi bien dans une cellule de
 * tableau que sous une tuile de carte — les cinq blocs de solde n'ayant pas la même
 * mise en page, c'est cette ventilation-là qui est mutualisée, pas la carte entière.
 *
 * ⚠ **N'affiche rien** quand il n'y a aucune majoration, ou quand le serveur ne
 * renvoie pas encore ces champs (ils sont optionnels côté modèle) : sur un dossier sans
 * enfants datés ni ancienneté suffisante, « Base 16 j » seul n'apprendrait rien.
 */
@Component({
  selector: 'app-detail-acquis-conge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="aDesMajorations" class="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
      <span class="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
        Base {{ solde!.acquisBase }} j
      </span>
      <span *ngIf="enfants > 0"
            class="rounded bg-pink-50 px-1.5 py-0.5 text-pink-700"
            [title]="titreEnfants">
        + {{ enfants }} j enfants
      </span>
      <span *ngIf="anciennete > 0"
            class="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700"
            [title]="titreAnciennete">
        + {{ anciennete }} j ancienneté
      </span>
    </div>
  `,
})
export class DetailAcquisCongeComponent {

  @Input() solde: SoldeConge | null = null;

  get enfants(): number {
    return this.solde?.supplementEnfants ?? 0;
  }

  get anciennete(): number {
    return this.solde?.supplementAnciennete ?? 0;
  }

  get aDesMajorations(): boolean {
    // acquisBase absent ⇒ backend antérieur : on ne rend rien plutôt qu'un « Base 0 j ».
    return this.solde?.acquisBase != null && (this.enfants > 0 || this.anciennete > 0);
  }

  get titreEnfants(): string {
    const n = this.solde?.enfantsBeneficiaires ?? 0;
    return `${n} enfant${n > 1 ? 's' : ''} ouvrant droit au 31/12/${this.solde?.anneeReference}`;
  }

  get titreAnciennete(): string {
    const n = this.solde?.anneesAnciennete ?? 0;
    return `${n} an${n > 1 ? 's' : ''} d'ancienneté au 31/12/${this.solde?.anneeReference}`;
  }
}
