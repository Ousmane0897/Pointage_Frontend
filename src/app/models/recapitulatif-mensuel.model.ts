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

  joursOuvrables: number;          // jours ouvrables dans le mois
  joursTravailles: number;
  joursAbsence: number;
  joursConge: number;
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
