/**
 * Modèle de données pour le Plan de Formation – Développement RH
 */

// ─── Types ────────────────────────────────────────────────────────

export type TypeFormateur = 'INTERNE' | 'EXTERNE';

export type StatutSession = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export type PrioriteBesoin = 'HAUTE' | 'MOYENNE' | 'BASSE';

export type SourceBesoin = 'EVALUATION' | 'MANAGER' | 'EMPLOYE';

export type StatutBesoin = 'IDENTIFIE' | 'PLANIFIE' | 'REALISE';

// ─── Interfaces ───────────────────────────────────────────────────

export interface Formation {
  id?: string;

  // Descriptif
  titre: string;
  description: string;
  competencesVisees: string[];
  dureeHeures: number;

  // Formateur
  typeFormateur: TypeFormateur;
  formateurNom: string;

  // Budget
  coutFcfa: number;              // montant en FCFA, sans décimales

  // État
  actif: boolean;
  dateCreation?: string;
}

export interface SessionFormation {
  id?: string;

  // Référence formation
  formationId: string;
  formationTitre?: string;

  // Planification
  dateDebut: string;             // yyyy-MM-dd
  dateFin: string;               // yyyy-MM-dd
  lieu: string;
  capaciteMax: number;
  participantsInscrits: number;

  // État
  statut: StatutSession;
}

export interface ParticipationFormation {
  id?: string;

  // Références
  sessionId: string;
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;

  // Suivi
  present: boolean;
  completee: boolean;
  attestationGeneree: boolean;
  dateAttestation?: string;
}

export interface EvaluationFormation {
  id?: string;

  // Références
  participationId: string;
  sessionId: string;
  employeId: string;

  // Évaluation
  note: number;                  // 1 à 5
  commentaire: string;
  dateEvaluation: string;        // yyyy-MM-dd
}

export interface BesoinFormation {
  id?: string;

  // Référence employé
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement: string;

  // Besoin identifié
  competenceLacune: string;
  priorite: PrioriteBesoin;
  formationSuggereId?: string;
  source: SourceBesoin;
  statut: StatutBesoin;
  dateIdentification: string;    // yyyy-MM-dd
}

export interface RecapBudgetFormation {
  annee: number;
  budgetPrevu: number;           // FCFA
  budgetConsomme: number;        // FCFA
  nombreFormations: number;
  tauxParticipation: number;     // pourcentage
}

// ─── Filtres ──────────────────────────────────────────────────────

export interface FiltreFormation {
  q?: string;
  actif?: boolean;
}

export interface FiltreSession {
  formationId?: string;
  statut?: StatutSession;
  dateDebut?: string;
  dateFin?: string;
  q?: string;
}

export interface FiltreBesoinFormation {
  departement?: string;
  priorite?: PrioriteBesoin;
  statut?: StatutBesoin;
  q?: string;
}

// ─── Labels fr-FR ─────────────────────────────────────────────────

export const LIBELLES_STATUT_SESSION: Record<StatutSession, string> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

export const LIBELLES_PRIORITE_BESOIN: Record<PrioriteBesoin, string> = {
  HAUTE: 'Haute',
  MOYENNE: 'Moyenne',
  BASSE: 'Basse',
};

export const LIBELLES_STATUT_BESOIN: Record<StatutBesoin, string> = {
  IDENTIFIE: 'Identifié',
  PLANIFIE: 'Planifié',
  REALISE: 'Réalisé',
};

export const LIBELLES_SOURCE_BESOIN: Record<SourceBesoin, string> = {
  EVALUATION: 'Évaluation périodique',
  MANAGER: 'Manager',
  EMPLOYE: 'Employé',
};
