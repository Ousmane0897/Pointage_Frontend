import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { HistoriqueWorkflow } from '../../../../../models/stock-v2-workflow.model';
import {
  LIBELLES_ACTION_WORKFLOW,
  COULEURS_ACTION_WORKFLOW,
} from '../../../../../constants/stock.constants';

/**
 * Timeline du workflow d'un bon — Module Stock v2 / 7.4.
 *
 * Composant présentational : affiche l'historique des actions (création,
 * soumission, validation, refus, mouvement effectif) avec horodatage et auteur.
 * Réutilisé par les fiches bon d'entrée / bon de sortie et le détail Kanban.
 */
@Component({
  selector: 'app-timeline-workflow',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './timeline-workflow.component.html',
  styleUrl: './timeline-workflow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineWorkflowComponent {

  @Input() historique: HistoriqueWorkflow[] = [];

  readonly LIBELLES_ACTION_WORKFLOW = LIBELLES_ACTION_WORKFLOW;
  readonly COULEURS_ACTION_WORKFLOW = COULEURS_ACTION_WORKFLOW;

  formatDateHeure(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const jj = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${jj}/${mm}/${d.getFullYear()} à ${hh}:${mi}`;
  }

  trackByIndex(i: number): number {
    return i;
  }
}
