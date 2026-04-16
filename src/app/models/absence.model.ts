/**
 * Modèle de données pour la Gestion des Absences – Temps & Présences
 */

export type TypeAbsence =
  | 'CONGE_PAYE'
  | 'MALADIE'
  | 'PERMISSION'
  | 'INJUSTIFIEE'
  | 'AUTRE';

export type StatutAbsence = 'DECLAREE' | 'JUSTIFIEE' | 'REFUSEE';

export interface PieceJustificative {
  id?: string;
  nom: string;
  url?: string;
  mimeType?: string;
  taille?: number;
  dateUpload?: string;
}

export interface Absence {
  id?: string;

  // Référence employé
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;

  // Données absence
  type: TypeAbsence;
  dateDebut: string;               // yyyy-MM-dd
  dateFin: string;                 // yyyy-MM-dd
  nombreJours?: number;            // calculé côté serveur
  motif?: string;
  statut?: StatutAbsence;

  // Pièces jointes
  pieceJustificative?: PieceJustificative | null;

  // Métadonnées
  dateCreation?: string;
  creeParId?: string;
}

export interface FiltreAbsence {
  employeId?: string;
  type?: TypeAbsence;
  statut?: StatutAbsence;
  dateDebut?: string;
  dateFin?: string;
  departement?: string;
  q?: string;
}
