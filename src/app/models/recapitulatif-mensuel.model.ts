/**
 * Modèle de données pour le Récapitulatif Mensuel – Temps & Présences
 * Ces données alimentent le module Paie (6.3).
 */

export interface RecapitulatifMensuel {
  employeId: string;
  matricule: string;
  nom: string;
  prenom: string;
  departement: string;
  poste?: string;

  mois: number;                    // 1-12
  annee: number;

  /**
   * Jours ouvrables **de cet employé** : rythme du site, jour de repos hebdomadaire et
   * jours fériés compris. ⚠ Ce n'est donc **pas la même valeur pour tout le monde** — un
   * agent de terrain en `LUN_SAM` en a davantage qu'un back-office. Ne jamais le traiter
   * comme une constante du mois.
   */
  joursOuvrables: number;

  /**
   * Jours du mois effectivement pointés, **fériés compris** : le travail réellement
   * effectué doit se voir. ⚠ Peut donc **dépasser `joursOuvrables`** quand un férié a été
   * travaillé — tout ratio construit dessus doit être plafonné à 1.
   */
  joursTravailles: number;

  /**
   * Jours dus et non honorés. ⚠ **Ne se recalcule pas** par
   * `joursOuvrables - joursTravailles - joursConge` : ces trois compteurs ne portent pas
   * sur le même ensemble de jours. Le serveur fait autorité.
   */
  joursAbsence: number;

  /**
   * Jours de congé approuvé tombant un jour ouvrable **de ce mois**, hors repos médical
   * (`joursReposMedical`) et hors absence non justifiée (comptée en absence).
   */
  joursConge: number;

  /**
   * Jours fériés du mois qui seraient tombés un jour travaillé par cet employé. Un férié
   * tombant son jour de repos ne lui fait rien gagner et n'est pas compté.
   *
   * Optionnel : un front en avance sur le backend dégrade proprement.
   */
  joursFeries?: number;

  /** Parmi les précédents, ceux qu'il a effectivement travaillés. */
  joursTravaillesFeries?: number;
  nombreRetards: number;
  minutesRetardTotal: number;

  heuresSupTotal: number;          // heures réelles
  heuresSupMajoreesEquivalent: number;

  heuresSupParType?: {
    t15?: number;
    t40?: number;
    t60?: number;
    t100?: number;
  };

  // ─── Contrôle du pointage par site — champs OPTIONNELS ───────────────────
  // Apparus avec le lot « récapitulatif par site » : un front en avance sur le
  // backend doit dégrader proprement (affichage « — »).

  /**
   * Jours de repos médical approuvé tombant un jour ouvrable du mois. **Ni absence, ni
   * congé** : ils sont exclus de `joursAbsence` comme de `joursConge`.
   */
  joursReposMedical?: number;

  /**
   * Minutes réellement travaillées (arrivée → départ), tous sites et hors planning
   * compris. ⚠ Un créneau sans départ n'y entre pas : voir `creneauxSansDepart`.
   */
  minutesTravaillees?: number;

  /** Créneaux pointés sans départ — leurs heures sont inconnues, jamais inventées. */
  creneauxSansDepart?: number;

  /** Pointages qu'aucun créneau du planning n'explique (ligne « Hors planning »). */
  horsPlan?: number;

  /** Code de pointage de l'agent (4 chiffres). */
  agentId?: string;

  /** Date d'attribution du code, ISO `yyyy-MM-ddTHH:mm:ss`. */
  dateCreationAgentId?: string | null;

  /**
   * Vrai quand la date ci-dessus est **reconstituée** (date de création du dossier) pour
   * un code antérieur à son enregistrement : à afficher comme approximative.
   */
  dateCreationAgentIdEstimee?: boolean;

  /**
   * Détail par site. Minutes et retards des sites s'additionnent pour donner ceux de
   * l'agent ; ⚠ **pas les jours travaillés** — un jour passé sur deux sites ne compte
   * qu'une fois pour l'agent. Avec le filtre « Site », seules les lignes de ce site sont
   * renvoyées, les cumuls de l'agent restant tous sites confondus.
   */
  sites?: RecapSite[];
}

/** Ligne « agent × site » du récapitulatif. */
export interface RecapSite {
  site: string;
  /** Ligne regroupant les pointages qu'aucun créneau n'explique. */
  horsPlanning: boolean;
  /** Plages horaires rencontrées sur le mois : « 06:00–10:00, 15:00–19:00 ». */
  horaires?: string | null;
  creneauxPrevus: number;
  /** Jours distincts où au moins un créneau de ce site a été pointé. */
  joursTravailles: number;
  minutesTravaillees: number;
  creneauxSansDepart: number;
  /** Créneaux passés non pointés (hors fériés et congés). */
  creneauxAbsents: number;
  /** Jours distincts comptant au moins un créneau absent sur ce site. */
  joursAbsence: number;
  /** Créneaux au-delà de la tolérance de retard. */
  nombreRetards: number;
  minutesRetardTotal: number;
}

/**
 * Durée lisible : `455` → `« 7 h 35 »`, `0` → `« 0 h 00 »`, absent → `« — »`.
 * Point unique de vérité pour l'écran et les exports.
 */
export function formaterMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

/** Heures décimales arrondies au centième — colonne exploitable par la paie dans Excel. */
export function minutesEnHeures(minutes: number | null | undefined): number {
  return Math.round(((minutes ?? 0) / 60) * 100) / 100;
}

export interface FiltreRecap {
  mois: number;                    // 1-12
  annee: number;
  departement?: string;
  site?: string;
  q?: string;
}
