import { PointageCentralise, StatutPresence } from '../../../models/pointage-centralise.model';

/**
 * Tolérance de retard (en minutes) appliquée côté affichage du pointage centralisé.
 *
 * En deçà (ou à égalité) de ce seuil, une arrivée tardive n'est PAS comptée comme
 * un retard : un employé prévu à 9h00 qui pointe à 9h13 n'est pas en retard, alors
 * qu'à 9h16 il l'est (et on affiche alors le retard réel complet, ex. 16 min).
 *
 * Cohérent avec `delaiRetardMinutes` (défaut 15) du module Alertes Terrain.
 */
export const TOLERANCE_RETARD_MINUTES = 15;

/** Vrai si le retard dépasse strictement la tolérance. */
export function estEnRetard(p: PointageCentralise): boolean {
  return (p.retardMinutes ?? 0) > TOLERANCE_RETARD_MINUTES;
}

/**
 * Statut effectif à afficher, tolérance appliquée. ABSENT / CONGE sont conservés
 * tels quels ; sinon on dérive PRESENT vs RETARD à partir du retard réel comparé
 * à la tolérance (le backend renvoie le retard brut, le front applique le seuil).
 */
export function statutAffiche(p: PointageCentralise): StatutPresence {
  if (p.statut === 'ABSENT' || p.statut === 'CONGE') return p.statut;
  return estEnRetard(p) ? 'RETARD' : 'PRESENT';
}
