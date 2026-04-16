import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { BulletinPaie, LigneBulletin } from '../../../../../models/bulletin-paie.model';

/**
 * Composant présentationnel (pure) : affiche un BulletinPaie calculé.
 * Réutilisé dans calcul-bulletin, fiche-bulletin (historique) et aperçu PDF.
 */
@Component({
  selector: 'app-preview-bulletin',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './preview-bulletin.component.html',
  styleUrl: './preview-bulletin.component.scss',
})
export class PreviewBulletinComponent {
  @Input() bulletin!: BulletinPaie | null;

  readonly NOMS_MOIS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  get gains(): LigneBulletin[] {
    return (this.bulletin?.lignes ?? []).filter(l => l.nature === 'GAIN');
  }

  get retenues(): LigneBulletin[] {
    return (this.bulletin?.lignes ?? []).filter(l => l.nature === 'RETENUE_SALARIALE');
  }

  get cotisationsPatronales(): LigneBulletin[] {
    return (this.bulletin?.lignes ?? [])
      .filter(l => l.montantPatronal !== undefined && l.montantPatronal > 0);
  }

  formaterFCFA(n: number | undefined): string {
    if (n === undefined || n === null) return '—';
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  }

  formaterTaux(t: number | undefined): string {
    if (t === undefined || t === null) return '';
    return (t * 100).toFixed(2) + ' %';
  }

  nomMois(m: number): string {
    return this.NOMS_MOIS[(m - 1 + 12) % 12] ?? '';
  }
}
