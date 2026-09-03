/**
 * Constantes du Calendrier des Congés — RH / 6.2 Temps & Présences.
 *
 * Point unique de vérité pour les libellés, couleurs et paramètres du circuit
 * de validation à 3 niveaux. Les composants ne doivent plus porter de map
 * inline (celles de `calendrier-conges` et `validation-conges` ont été
 * supprimées au profit de ce fichier).
 */

import {
  ActionValidationConge,
  NiveauValidation,
  StatutDemande,
  TypeConge,
} from '../models/conge.model';

// ─── Types de congé ─────────────────────────────────────────────────────────

export const LIBELLES_TYPE_CONGE: Record<TypeConge, string> = {
  ANNUEL: 'Annuel',
  MATERNITE: 'Maternité',
  PATERNITE: 'Paternité',
  REPOS_MEDICAL: 'Repos médical',
  SANS_SOLDE: 'Sans solde',
  EXCEPTIONNEL: 'Exceptionnel',
  ABSENCE_NON_JUSTIFIEE: 'Absence non justifiée',
};

/** Ordre d'affichage (select du formulaire, filtre du calendrier) — même ordre que l'enum serveur. */
export const ORDRE_TYPES_CONGE: TypeConge[] = [
  'ANNUEL', 'MATERNITE', 'PATERNITE', 'REPOS_MEDICAL',
  'SANS_SOLDE', 'EXCEPTIONNEL', 'ABSENCE_NON_JUSTIFIEE',
];

/**
 * Types imputés sur les jours de congé annuel acquis.
 *
 * ⚠ **Miroir d'affichage** de `TypeConge.decompteSoldeAnnuel()` côté serveur, qui reste
 * l'autorité : ne sert qu'à prévenir l'utilisateur avant qu'il ne soumette. Un repos
 * médical, un congé maternité ou un congé sans solde n'entament pas le compteur de congés
 * payés. Toute évolution de la règle serveur doit être répercutée ici.
 */
export const TYPES_DECOMPTES_DU_SOLDE: TypeConge[] = ['ANNUEL'];

/** Ce type de congé ampute-t-il le solde annuel ? (affichage seulement) */
export function decompteLeSolde(type: TypeConge | null | undefined): boolean {
  return !!type && TYPES_DECOMPTES_DU_SOLDE.includes(type);
}

// ─── Statuts du circuit ─────────────────────────────────────────────────────

export const LIBELLES_STATUT_DEMANDE: Record<StatutDemande, string> = {
  EN_ATTENTE: 'En attente',                 // legacy mono-niveau
  EN_ATTENTE_SUPERIEUR: 'En attente supérieur',
  EN_ATTENTE_RH: 'En attente RH',
  EN_ATTENTE_DG: 'En attente Direction',
  APPROUVE: 'Approuvée',
  REFUSE: 'Refusée',
  ANNULE: 'Annulée',
};

/** Classes Tailwind du badge — celles de l'ancien `getStatutClasses` sont conservées. */
export const COULEURS_STATUT_DEMANDE: Record<StatutDemande, string> = {
  EN_ATTENTE: 'bg-slate-100 text-slate-700 border border-slate-200',
  EN_ATTENTE_SUPERIEUR: 'bg-amber-100 text-amber-700 border border-amber-200',
  EN_ATTENTE_RH: 'bg-blue-100 text-blue-700 border border-blue-200',
  EN_ATTENTE_DG: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  APPROUVE: 'bg-green-100 text-green-700 border border-green-200',
  REFUSE: 'bg-red-100 text-red-700 border border-red-200',
  ANNULE: 'bg-gray-100 text-gray-500 border border-gray-200',
};

/** Ordre d'affichage des statuts (filtres, tri). Le legacy en est exclu. */
export const ORDRE_STATUTS_DEMANDE: StatutDemande[] = [
  'EN_ATTENTE_SUPERIEUR', 'EN_ATTENTE_RH', 'EN_ATTENTE_DG',
  'APPROUVE', 'REFUSE', 'ANNULE',
];

/** Statuts « en cours de circuit » — un seul test partout, legacy inclus. */
export const STATUTS_EN_COURS: StatutDemande[] = [
  'EN_ATTENTE', 'EN_ATTENTE_SUPERIEUR', 'EN_ATTENTE_RH', 'EN_ATTENTE_DG',
];

/** Une demande est-elle encore dans le circuit ? */
export function estEnCours(statut: StatutDemande): boolean {
  return STATUTS_EN_COURS.includes(statut);
}

// ─── Niveaux de validation ──────────────────────────────────────────────────

export const LIBELLES_NIVEAU: Record<NiveauValidation, string> = {
  SUPERIEUR: 'Supérieur hiérarchique',
  RH: 'Responsable RH',
  DIRECTION_GENERALE: 'Direction générale',
};

export const LIBELLES_NIVEAU_COURT: Record<NiveauValidation, string> = {
  SUPERIEUR: 'N1 — Supérieur',
  RH: 'N2 — RH',
  DIRECTION_GENERALE: 'N3 — Direction',
};

export const COULEURS_NIVEAU: Record<NiveauValidation, string> = {
  SUPERIEUR: 'bg-amber-100 text-amber-700 border border-amber-200',
  RH: 'bg-blue-100 text-blue-700 border border-blue-200',
  DIRECTION_GENERALE: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
};

export const ORDRE_NIVEAUX: NiveauValidation[] = [
  'SUPERIEUR', 'RH', 'DIRECTION_GENERALE',
];

/** Statut d'attente associé à chaque niveau. */
export const STATUT_ATTENTE_PAR_NIVEAU: Record<NiveauValidation, StatutDemande> = {
  SUPERIEUR: 'EN_ATTENTE_SUPERIEUR',
  RH: 'EN_ATTENTE_RH',
  DIRECTION_GENERALE: 'EN_ATTENTE_DG',
};

/** Niveau attendu pour un statut donné (`undefined` si le statut est terminal). */
export const NIVEAU_PAR_STATUT: Partial<Record<StatutDemande, NiveauValidation>> = {
  EN_ATTENTE: 'SUPERIEUR',              // repli legacy : ancien EN_ATTENTE = niveau 1
  EN_ATTENTE_SUPERIEUR: 'SUPERIEUR',
  EN_ATTENTE_RH: 'RH',
  EN_ATTENTE_DG: 'DIRECTION_GENERALE',
};

// ─── Actions tracées dans l'historique ──────────────────────────────────────

export const LIBELLES_ACTION_VALIDATION: Record<ActionValidationConge, string> = {
  CREATION: 'Demande soumise',
  VALIDATION: 'Validée',
  REFUS: 'Refusée',
  ANNULATION: 'Annulée',
  MODIFICATION: 'Modifiée',
};

export const COULEURS_ACTION_VALIDATION: Record<ActionValidationConge, string> = {
  CREATION: 'bg-slate-400',
  VALIDATION: 'bg-green-500',
  REFUS: 'bg-red-500',
  ANNULATION: 'bg-gray-400',
  MODIFICATION: 'bg-slate-500',
};

// ─── Temps réel ─────────────────────────────────────────────────────────────

/** Broadcast — toute transition du circuit. */
export const TOPIC_CONGES_VALIDATIONS = '/topic/conges-validations';
/** Queue ciblée — validateur du niveau désormais attendu, puis demandeur. */
export const QUEUE_NOTIFICATIONS_CONGES = '/user/queue/notifications-conges';

// ─── Paramètres ─────────────────────────────────────────────────────────────

export const PARAMETRES_CONGES = {
  pageSize: 10,
  /**
   * Plus strict que les 5 caractères du dialog d'annulation d'affectation :
   * le motif de refus part par e-mail au demandeur.
   */
  motifRefusMinLength: 10,
  commentaireMaxLength: 500,
  /**
   * Jours ouvrables acquis par mois de service effectif (droit sénégalais : 2 j/mois,
   * soit 24 j pour une année pleine).
   *
   * ⚠ **Miroir d'affichage** de `app.conges.jours-acquis-par-mois` côté serveur, qui reste
   * l'autorité et renvoie déjà `acquis` et `moisAcquis` calculés — comme
   * {@link TYPES_DECOMPTES_DU_SOLDE}. Ne sert qu'à composer un libellé explicatif : le front
   * ne recalcule jamais de droits.
   */
  joursAcquisParMois: 2,
};
