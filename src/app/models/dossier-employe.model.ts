/**
 * Modèle de données pour le dossier employé – Gestion du Personnel
 */

export interface ContactUrgence {
  nom: string;
  lienParente: string;
  telephone: string;
}

export type SituationMatrimoniale = 'CELIBATAIRE' | 'MARIE';

export interface DossierEmploye {
  id?: string;
  matricule: string;

  // Identité
  nom: string;
  prenom: string;
  dateNaissance: Date | null;
  genre: 'HOMME' | 'FEMME';
  nationalite: string;
  photoUrl?: string;
  numeroIdentification?: string;
  situationMatrimoniale?: SituationMatrimoniale;
  nombreEnfants?: number;

  // Poste
  poste: string;
  departement: string;
  siteAffecte: string;
  dateEntree: Date | null;
  statut: 'ACTIF' | 'EN_PERIODE_ESSAI' | 'SUSPENDU' | 'SORTI';
  superieurHierarchiqueId?: string;
  superieurHierarchiqueNom?: string;
  dureeEssaiMois?: number;

  // Contacts
  telephone: string;
  email: string;
  adresse: string;

  // Urgence
  contactUrgence: ContactUrgence;
}

export interface FiltreEmploye {
  departement?: string;
  site?: string;
  poste?: string;
  statut?: string;
  q?: string;
}
