/**
 * Modèle de données pour l'organigramme hiérarchique – Gestion du Personnel
 */

export interface NoeudOrganigramme {
  id: string;
  nom: string;
  prenom: string;
  poste: string;
  departement: string;
  photoUrl?: string;
  managerId?: string;
  enfants?: NoeudOrganigramme[];
}

export interface Departement {
  id?: string;
  nom: string;
  responsableId?: string;
  responsableNom?: string;
  effectif: number;
  sousEquipes?: Departement[];
}
