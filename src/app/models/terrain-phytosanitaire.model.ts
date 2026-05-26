/**
 * Modèles pour le Suivi Phytosanitaire — Module Exploitation Terrain (5.2).
 *
 * Traçabilité réglementaire des applications phytosanitaires : qui a
 * appliqué quoi (produit homologué + dose), où (zone traitée), quand.
 * Alertes pour les délais de réentrée et de nouvelle application.
 */

export type CategoriePhyto =
  | 'HERBICIDE'
  | 'INSECTICIDE'
  | 'FONGICIDE'
  | 'RODENTICIDE'
  | 'DESINFECTANT'
  | 'AUTRE';

export interface ProduitPhytosanitaire {
  id?: string;
  nomCommercial: string;
  matiereActive?: string;
  categorie: CategoriePhyto;
  numeroHomologation: string;          // obligatoire — conformité réglementaire
  doseRecommandee?: string;            // ex: "5 L/ha"
  delaiReentreeHeures?: number;        // délai avant retour sur zone
  delaiAvantNouvelleApplicationJours?: number;
  fournisseur?: string;
  fdsUrl?: string;                     // fiche de données sécurité (PDF)
  actif: boolean;
  createdAt?: string;
}

export type StatutApplicationPhyto =
  | 'PLANIFIEE'
  | 'EN_COURS'
  | 'EFFECTUEE'
  | 'ANNULEE';

export interface ZoneTraitement {
  libelle: string;                     // ex: "Pelouse Nord"
  surfaceM2?: number;
  description?: string;
}

export interface ApplicationPhyto {
  id?: string;
  numero: string;                      // ex: PHYTO-20260526-001

  // Site
  siteId: string;
  siteCode?: string;
  siteNom?: string;

  // Agent
  employeId: string;
  employeMatricule?: string;
  employeNom?: string;

  // Produit
  produitId: string;
  produitNomCommercial?: string;
  produitNumeroHomologation?: string;
  doseAppliquee: number;
  doseUnite: string;                   // L, mL, kg, g
  zoneTraitee: ZoneTraitement;

  // Conditions
  dateApplication: string;             // ISO
  conditionsMeteo?: string;            // libre — ex: "Ensoleillé, vent 5 km/h"
  temperatureC?: number;

  statut: StatutApplicationPhyto;
  commentaire?: string;

  // Délais réglementaires calculés
  dateFinReentree?: string;            // dateApplication + delaiReentreeHeures
  dateProchaineApplicationAutorisee?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface AlerteDelaiPhyto {
  applicationId: string;
  type: 'REENTREE_ACTIVE' | 'NOUVELLE_APPLICATION_INTERDITE';
  siteId: string;
  siteNom?: string;
  zoneTraitee?: string;
  produitNom?: string;
  dateFinContrainte: string;
  heuresRestantes: number;
}

export interface FiltreApplicationPhyto {
  dateDebut?: string;
  dateFin?: string;
  siteId?: string;
  employeId?: string;
  produitId?: string;
  categorie?: CategoriePhyto;
  statut?: StatutApplicationPhyto;
}
