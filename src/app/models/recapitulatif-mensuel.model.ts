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

  /** Jours de congé approuvé tombant un jour ouvrable **de ce mois**. */
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
}

export interface FiltreRecap {
  mois: number;                    // 1-12
  annee: number;
  departement?: string;
  site?: string;
  q?: string;
}
