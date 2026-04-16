/**
 * Modèle de données pour le suivi de la période d'essai – Gestion du Personnel
 */

export type StatutPeriodeEssai = 'EN_COURS' | 'TITULARISE' | 'PROLONGE' | 'NON_RENOUVELE';

export type StatutValidation = 'EN_ATTENTE_MANAGER' | 'VALIDEE_MANAGER' | 'VALIDEE_RH' | 'CONFIRMEE' | 'REFUSEE';

export interface PeriodeEssai {
  id?: string;
  employeId: string;
  employeNom?: string;
  employePrenom?: string;
  contratId: string;
  typeContrat: string;

  dateDebut: Date | null;
  dateFin: Date | null;
  dureeJours: number;
  statut: StatutPeriodeEssai;

  alertes: AlertePeriodeEssai[];
  decisions?: DecisionPeriodeEssai[];
}

export interface AlertePeriodeEssai {
  id?: string;
  periodeEssaiId: string;
  joursAvant: number;
  dateAlerte: Date | null;
  envoyee: boolean;
}

export interface DecisionPeriodeEssai {
  id?: string;
  periodeEssaiId: string;
  decision: StatutPeriodeEssai;
  dateDecision: Date | null;
  decideurNom: string;
  decideurRole: string;
  commentaire: string;
}

export interface DemandeValidation {
  id?: string;
  periodeEssaiId: string;
  employeId: string;
  employeNom?: string;
  employePrenom?: string;
  statut: StatutValidation;
  dateCreation: Date | null;
  commentaireManager?: string;
  commentaireRh?: string;
  dateFinalisation?: Date | null;
}
