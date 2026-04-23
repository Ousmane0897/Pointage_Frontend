/**
 * Modèle de données pour les contrats de travail – Gestion du Personnel
 */

export type TypeContrat = 'CDI' | 'CDD' | 'STAGE' | 'PRESTATION';

export type StatutContrat = 'ACTIF' | 'EXPIRE' | 'RENOUVELE' | 'RESILIE';

export interface Contrat {
  id?: string;
  employeId: string;
  employeNom?: string;
  employePrenom?: string;

  typeContrat: TypeContrat;
  dateDebut: Date | null;
  dateFin: Date | null;
  statut: StatutContrat;
  clauses: string;
  joursAvantAlerte: number;

  // Fichier du contrat (PDF/DOC/DOCX)
  fichierUrl?: string;
  fichierNom?: string;
  tailleFichier?: number;

  // Historique des renouvellements
  renouvellements?: Renouvellement[];
  avenants?: Avenant[];
}

export interface Renouvellement {
  id?: string;
  contratId: string;
  ancienneDateFin: Date | null;
  nouvelleDateFin: Date | null;
  dateRenouvellement: Date | null;
  motif: string;
}

export interface Avenant {
  id?: string;
  contratId: string;
  dateCreation: Date | null;
  objet: string;
  description: string;
  dateEffet: Date | null;
}

export interface AlerteContrat {
  contratId: string;
  employeId: string;
  employeNom: string;
  employePrenom: string;
  typeContrat: TypeContrat;
  dateFin: Date | null;
  joursRestants: number;
}
