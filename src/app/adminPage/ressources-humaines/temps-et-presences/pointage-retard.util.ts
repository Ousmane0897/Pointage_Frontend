import { PointageCentralise, StatutPresence } from '../../../models/pointage-centralise.model';

/**
 * Tolérance de retard (minutes) appliquée à l'affichage du pointage centralisé.
 *
 * ⚠ **Miroir d'affichage, pas la règle.** Le serveur porte l'autorité via la propriété
 * `rh.pointage.tolerance-retard-minutes` (défaut 15) : c'est lui qui décide entre
 * `PRESENT` et `RETARD`, en comparant l'arrivée au `horaireDebut` **du site de la
 * ligne**. Cette constante ne sert plus qu'à formuler l'infobulle ; toute évolution du
 * seuil se fait côté serveur, et se répercute ici pour rester cohérent.
 */
export const TOLERANCE_RETARD_MINUTES = 15;

/**
 * Vrai si la ligne est en retard. On lit le statut serveur plutôt que de comparer soi-même
 * `retardMinutes` au seuil : le retard est brut (tolérance non déduite), et le seuil réel
 * est celui configuré côté serveur, pas la constante ci-dessus.
 */
export function estEnRetard(p: PointageCentralise): boolean {
  return p.statut === 'RETARD';
}

/**
 * Statut à afficher.
 *
 * ⚠ Cette fonction ne **dérive plus rien** : elle renvoie le statut serveur tel quel.
 * L'ancienne version repliait sur `PRESENT` tout ce qui n'était ni `ABSENT` ni `CONGE`,
 * ce qui afficherait désormais « Présent » sur un créneau `NEUTRE` non encore commencé.
 * Elle corrige au passage l'incohérence d'origine entre le badge (tolérance appliquée
 * côté client) et le filtre / les tuiles (statut brut côté serveur), qui pouvaient
 * afficher « Présent » sur une ligne filtrée comme « Retard ».
 */
export function statutAffiche(p: PointageCentralise): StatutPresence {
  return p.statut;
}

/** Ligne à griser : le créneau n'a pas encore commencé, rien n'est encore attendu. */
export function estNeutre(p: PointageCentralise): boolean {
  return p.statut === 'NEUTRE';
}

// ─── Badges ────────────────────────────────────────────────────────────────────
// Point unique de vérité : ces trois maps étaient dupliquées verbatim dans la vue du
// jour et dans l'historique.

export const CLASSES_STATUT: Record<StatutPresence, string> = {
  PRESENT: 'bg-green-100 text-green-700 border border-green-200',
  ABSENT: 'bg-red-100 text-red-700 border border-red-200',
  RETARD: 'bg-amber-100 text-amber-700 border border-amber-200',
  CONGE: 'bg-blue-100 text-blue-700 border border-blue-200',
  NEUTRE: 'bg-gray-100 text-gray-500 border border-gray-200',
  EN_ATTENTE: 'bg-sky-100 text-sky-700 border border-sky-200',
  HORS_PLAN: 'bg-purple-100 text-purple-700 border border-purple-200',
};

export const LIBELLES_STATUT: Record<StatutPresence, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  RETARD: 'Retard',
  CONGE: 'En congé',
  NEUTRE: 'À venir',
  EN_ATTENTE: 'En attente',
  HORS_PLAN: 'Hors planning',
};

export const ICONES_STATUT: Record<StatutPresence, string> = {
  PRESENT: 'CheckCircle2',
  ABSENT: 'XCircle',
  RETARD: 'AlertTriangle',
  CONGE: 'Plane',
  NEUTRE: 'Minus',
  EN_ATTENTE: 'Clock',
  HORS_PLAN: 'HelpCircle',
};

/** Infobulle expliquant un statut qui ne se devine pas depuis la seule colonne Statut. */
export const DESCRIPTIONS_STATUT: Record<StatutPresence, string> = {
  PRESENT: 'Arrivé dans les temps sur ce site.',
  ABSENT: "Le créneau est terminé et aucun pointage n'a été enregistré.",
  RETARD: `Arrivé plus de ${TOLERANCE_RETARD_MINUTES} min après l'heure de début de ce site.`,
  CONGE: 'Congé approuvé couvrant la journée.',
  NEUTRE: "L'heure de début de ce site n'est pas encore arrivée.",
  EN_ATTENTE: 'Le créneau a commencé, le pointage est encore attendu.',
  HORS_PLAN: "Pointage sans créneau prévu : vérifier les affectations de l'agent.",
};

/** Horaire attendu du site, « 08:00 - 17:00 », ou null si le site n'en porte pas. */
export function horairePrevu(p: PointageCentralise): string | null {
  if (!p.siteHoraireDebut && !p.siteHoraireFin) return null;
  return `${p.siteHoraireDebut ?? '—'} - ${p.siteHoraireFin ?? '—'}`;
}
