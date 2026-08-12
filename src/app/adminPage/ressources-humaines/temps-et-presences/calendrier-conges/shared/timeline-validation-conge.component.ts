import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import {
  COULEURS_ACTION_VALIDATION,
  LIBELLES_ACTION_VALIDATION,
  LIBELLES_NIVEAU,
  ORDRE_NIVEAUX,
  STATUT_ATTENTE_PAR_NIVEAU,
  STATUTS_EN_COURS,
} from '../../../../../constants/conges.constants';
import {
  DecisionNiveau,
  DemandeConge,
  NiveauValidation,
} from '../../../../../models/conge.model';

/** État d'affichage d'une étape du circuit. */
type EtatEtape = 'FRANCHIE' | 'EN_COURS' | 'A_VENIR' | 'IGNOREE' | 'REFUSEE' | 'INTERROMPUE';

interface EtapeCircuit {
  niveau: NiveauValidation;
  libelle: string;
  etat: EtatEtape;
  decision?: DecisionNiveau;
}

/**
 * Stepper des 3 niveaux de validation d'une demande de congé.
 *
 * Volontairement distinct de `timeline-workflow` (Stock v2 / 7.4) : celui-ci
 * n'affiche qu'un journal d'actions **passées**, alors qu'on veut ici rendre les
 * 3 étapes en permanence — y compris celles à venir et l'étape *sautée* quand le
 * demandeur n'a pas de supérieur hiérarchique. L'historique brut reste affiché
 * en dessous, repliable.
 */
@Component({
  selector: 'app-timeline-validation-conge',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <ol class="relative ml-2 border-l border-slate-200">
        <li *ngFor="let e of etapes; trackBy: trackByNiveau" class="mb-5 ml-5 last:mb-0">
          <span class="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-white"
                [ngClass]="couleurPastille(e.etat)"></span>

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold"
                  [ngClass]="e.etat === 'A_VENIR' ? 'text-slate-400' : 'text-slate-800'">
              {{ e.libelle }}
            </span>
            <span class="rounded-full px-2 py-0.5 text-[0.7rem] font-medium"
                  [ngClass]="couleurEtiquette(e.etat)">
              {{ libelleEtat(e.etat) }}
            </span>
          </div>

          <p *ngIf="e.decision?.decideurNom" class="mt-0.5 text-xs text-slate-600">
            Par <span class="font-medium text-slate-800">{{ e.decision!.decideurNom }}</span>
            <span *ngIf="e.decision?.date"> — {{ formatDateHeure(e.decision!.date) }}</span>
          </p>
          <p *ngIf="e.decision?.commentaire" class="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-xs italic text-slate-600">
            « {{ e.decision!.commentaire }} »
          </p>
          <p *ngIf="e.etat === 'IGNOREE'" class="mt-0.5 text-xs text-amber-600">
            Aucun supérieur hiérarchique renseigné — niveau ignoré.
          </p>
        </li>
      </ol>

      <div *ngIf="demande?.statut === 'REFUSE'"
           class="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <p class="flex items-center gap-1.5 text-sm font-semibold text-red-700">
          <lucide-icon name="XCircle" class="h-4 w-4"></lucide-icon>
          Demande refusée
          <span *ngIf="demande?.niveauRefus" class="font-normal">
            au niveau {{ libelleNiveau(demande!.niveauRefus!) }}
          </span>
        </p>
        <p *ngIf="demande?.motifRefus" class="mt-1 text-xs text-red-700">
          Motif : {{ demande!.motifRefus }}
        </p>
      </div>

      <div *ngIf="demande?.historique?.length">
        <button type="button" (click)="historiqueOuvert = !historiqueOuvert"
                class="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
          <lucide-icon name="History" class="h-3.5 w-3.5"></lucide-icon>
          {{ historiqueOuvert ? 'Masquer' : 'Afficher' }} l'historique détaillé
        </button>
        <ul *ngIf="historiqueOuvert" class="mt-2 space-y-1.5">
          <li *ngFor="let h of demande!.historique; trackBy: trackByIndex"
              class="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-600">
            <span class="inline-block h-2 w-2 rounded-full" [ngClass]="COULEURS_ACTION[h.action]"></span>
            <span class="font-medium text-slate-800">{{ LIBELLES_ACTION[h.action] }}</span>
            <span *ngIf="h.niveau">({{ libelleNiveau(h.niveau) }})</span>
            <span *ngIf="h.auteurNom">— {{ h.auteurNom }}</span>
            <span class="text-slate-400">{{ formatDateHeure(h.date) }}</span>
            <span *ngIf="h.commentaire" class="w-full italic text-slate-500">« {{ h.commentaire }} »</span>
          </li>
        </ul>
      </div>
    </div>
  `,
})
export class TimelineValidationCongeComponent {

  @Input({ required: true }) demande!: DemandeConge | null;

  readonly LIBELLES_ACTION = LIBELLES_ACTION_VALIDATION;
  readonly COULEURS_ACTION = COULEURS_ACTION_VALIDATION;

  historiqueOuvert = false;

  /** Les 3 étapes du circuit, avec leur état vis-à-vis du statut courant. */
  get etapes(): EtapeCircuit[] {
    const d = this.demande;
    if (!d) return [];

    const indexCourant = ORDRE_NIVEAUX.findIndex(
      n => STATUT_ATTENTE_PAR_NIVEAU[n] === d.statut,
    );
    // Statut legacy `EN_ATTENTE` ⇒ niveau 1, terminal ⇒ -1.
    const courant = d.statut === 'EN_ATTENTE' ? 0 : indexCourant;
    const enCours = STATUTS_EN_COURS.includes(d.statut);

    return ORDRE_NIVEAUX.map((niveau, i) => {
      const decision = this.decisionDe(niveau);
      let etat: EtatEtape;

      if (niveau === 'SUPERIEUR' && d.niveauSuperieurIgnore) {
        etat = 'IGNOREE';
      } else if (decision?.date) {
        etat = 'FRANCHIE';
      } else if (d.statut === 'REFUSE') {
        etat = d.niveauRefus === niveau ? 'REFUSEE' : 'INTERROMPUE';
      } else if (d.statut === 'ANNULE') {
        etat = 'INTERROMPUE';
      } else if (enCours && i === courant) {
        etat = 'EN_COURS';
      } else if (!enCours) {
        etat = 'FRANCHIE';       // APPROUVE : tous les niveaux sont passés
      } else {
        etat = 'A_VENIR';
      }

      return { niveau, libelle: LIBELLES_NIVEAU[niveau], etat, decision };
    });
  }

  libelleNiveau(n: NiveauValidation): string {
    return LIBELLES_NIVEAU[n];
  }

  libelleEtat(e: EtatEtape): string {
    const map: Record<EtatEtape, string> = {
      FRANCHIE: 'Validé',
      EN_COURS: 'En attente',
      A_VENIR: 'À venir',
      IGNOREE: 'Ignoré',
      REFUSEE: 'Refusé',
      INTERROMPUE: 'Non atteint',
    };
    return map[e];
  }

  couleurPastille(e: EtatEtape): string {
    const map: Record<EtatEtape, string> = {
      FRANCHIE: 'bg-green-500',
      EN_COURS: 'bg-amber-500',
      A_VENIR: 'bg-slate-300',
      IGNOREE: 'bg-amber-300',
      REFUSEE: 'bg-red-500',
      INTERROMPUE: 'bg-slate-300',
    };
    return map[e];
  }

  couleurEtiquette(e: EtatEtape): string {
    const map: Record<EtatEtape, string> = {
      FRANCHIE: 'bg-green-100 text-green-700',
      EN_COURS: 'bg-amber-100 text-amber-700',
      A_VENIR: 'bg-slate-100 text-slate-500',
      IGNOREE: 'bg-amber-50 text-amber-600',
      REFUSEE: 'bg-red-100 text-red-700',
      INTERROMPUE: 'bg-slate-100 text-slate-500',
    };
    return map[e];
  }

  formatDateHeure(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  trackByNiveau(_: number, e: EtapeCircuit): string { return e.niveau; }
  trackByIndex(i: number): number { return i; }

  private decisionDe(niveau: NiveauValidation): DecisionNiveau | undefined {
    switch (niveau) {
      case 'SUPERIEUR': return this.demande?.decisionSuperieur;
      case 'RH': return this.demande?.decisionRh;
      case 'DIRECTION_GENERALE': return this.demande?.decisionDg;
    }
  }
}
