/**
 * Modèle de données pour le Pointage Centralisé – Temps & Présences
 * Vue agrégée des pointages (remontés du module Exploitation) pour tout le personnel.
 */

/**
 * Statut d'une ligne. Depuis le rattachement des horaires au site, une ligne est un
 * **créneau** (employé × jour × site attendu) :
 *
 * - `NEUTRE` — le créneau n'a pas encore commencé : ni présent, ni absent (ligne grisée).
 * - `EN_ATTENTE` — le créneau est ouvert, l'agent n'a pas encore pointé.
 * - `ABSENT` — le créneau est terminé sans pointage.
 * - `HORS_PLAN` — un pointage qu'aucun créneau attendu n'explique (affectations non
 *   tenues à jour, pointage un jour non travaillé). Signalé plutôt que fondu dans
 *   « présent » ou « absent ».
 *
 * Le serveur est **autorité** sur ce statut : il connaît l'horaire du site et l'heure
 * courante. Le front ne le recalcule pas.
 */
export type StatutPresence =
  | 'PRESENT' | 'ABSENT' | 'RETARD' | 'CONGE'
  | 'NEUTRE' | 'EN_ATTENTE' | 'HORS_PLAN';

export interface PointageCentralise {
  /**
   * Identifiant du **créneau**, stable : il ne change pas quand l'agent finit par
   * pointer (l'identifiant du pointage est `pointageId`). C'est ce qui permet au
   * `trackBy` de ne pas recréer la ligne à chaque rafraîchissement.
   */
  id?: string;

  // Référence employé (reprend les champs clés de DossierEmploye)
  employeId: string;
  matricule: string;
  nom: string;
  prenom: string;
  /** Site du créneau ; sur une ligne hors planning, les sites portés par le pointage. */
  site: string;
  departement: string;
  poste?: string;

  // Pointage
  date: string;                    // ISO yyyy-MM-dd
  heureArrivee?: string | null;    // HH:mm
  heureDepart?: string | null;     // HH:mm
  dureeMinutes?: number;           // durée travaillée en minutes
  retardMinutes?: number;          // retard BRUT, tolérance non déduite
  statut: StatutPresence;
  motif?: string;                  // motif absence / retard si pertinent

  /** Horaire attendu sur ce site — permet d'afficher « arrivé 08:42, prévu 08:00 ». */
  siteHoraireDebut?: string | null;
  siteHoraireFin?: string | null;

  /** Identifiant du pointage rattaché ; absent tant que l'agent n'a pas pointé. */
  pointageId?: string | null;

  /** `false` sur une ligne hors planning. */
  planifie?: boolean;
}

export interface FiltrePointage {
  date?: string;              // yyyy-MM-dd (défaut : aujourd'hui)
  dateDebut?: string;
  dateFin?: string;
  departement?: string;
  site?: string;
  statut?: StatutPresence;
  q?: string;                 // recherche nom / matricule
}

/**
 * Compteurs de la journée.
 *
 * ⚠ **Deux unités cohabitent, ne pas les additionner.** `totalEmployes` et `enConge`
 * comptent des *personnes* ; tous les autres comptent des *créneaux*. Un agent en retard
 * sur deux sites pèse deux fois dans `retards` et une seule dans `totalEmployes`.
 * L'invariant est `presents + retards + absents + enAttente + neutres === creneauxPrevus`.
 */
export interface ResumeJournee {
  date: string;
  /** Effectif actif distinct (personnes). */
  totalEmployes: number;
  /** Créneaux attendus ce jour (lignes) — dénominateur des compteurs ci-dessous. */
  creneauxPrevus: number;
  presents: number;
  absents: number;
  retards: number;
  /** Créneau commencé, agent pas encore pointé. */
  enAttente: number;
  /** Créneau pas encore commencé. */
  neutres: number;
  /** Pointages sans créneau attendu — compteur d'alerte. */
  horsPlan: number;
  /** Employés en congé approuvé (personnes). */
  enConge: number;
}
