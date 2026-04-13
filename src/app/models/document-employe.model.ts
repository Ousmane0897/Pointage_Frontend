/**
 * Modèle de données pour les documents employé – Gestion du Personnel
 */

export type CategorieDocument = 'CNI' | 'DIPLOME' | 'CERTIFICAT' | 'ATTESTATION' | 'CONTRAT' | 'AUTRE';

export type StatutDocument = 'VALIDE' | 'EN_ATTENTE' | 'REFUSE' | 'EXPIRE';

export interface DocumentEmploye {
  id?: string;
  employeId: string;
  employeNom?: string;
  employePrenom?: string;

  nom: string;
  categorie: CategorieDocument;
  fichierUrl: string;
  tailleFichier?: number;
  typeMime?: string;

  dateUpload: Date | null;
  dateExpiration?: Date | null;
  statut: StatutDocument;
  commentaire?: string;
}
