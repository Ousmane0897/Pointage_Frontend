/**
 * Modèle de données pour le Calendrier des Congés – Temps & Présences
 */

export type TypeConge =
  | 'ANNUEL'
  | 'MATERNITE'
  | 'PATERNITE'
  | 'SANS_SOLDE'
  | 'EXCEPTIONNEL';

export type StatutDemande = 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE' | 'ANNULE';

export interface SoldeConge {
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;
  anneeReference: number;
  acquis: number;      // jours acquis
  pris: number;        // jours pris
  enCours: number;     // jours en demande en attente
  solde: number;       // jours restants
}

export interface DemandeConge {
  id?: string;

  // Référence employé
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;

  // Demande
  type: TypeConge;
  dateDebut: string;          // yyyy-MM-dd
  dateFin: string;            // yyyy-MM-dd
  nombreJours?: number;
  motif?: string;

  // Workflow
  statut: StatutDemande;
  dateDemande?: string;
  dateDecision?: string;
  decideurId?: string;
  decideurNom?: string;
  commentaireDecision?: string;
}

export interface FiltreConge {
  employeId?: string;
  departement?: string;
  statut?: StatutDemande;
  type?: TypeConge;
  dateDebut?: string;
  dateFin?: string;
  q?: string;
}
