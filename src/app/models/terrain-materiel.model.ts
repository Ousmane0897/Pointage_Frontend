/**
 * Modèles pour la Gestion Matériel par Site — Module Exploitation Terrain (5.2).
 *
 * Inventaire des machines et équipements affectés par site client, avec
 * suivi de maintenance préventive et historique des pannes.
 */

export type TypeMateriel =
  | 'AUTOLAVEUSE'
  | 'MONOBROSSE'
  | 'ASPIRATEUR'
  | 'NETTOYEUR_HAUTE_PRESSION'
  | 'TONDEUSE'
  | 'DEBROUSSAILLEUSE'
  | 'PULVERISATEUR'
  | 'OUTILLAGE_MANUEL'
  | 'EPI'
  | 'AUTRE';

export type StatutMateriel =
  | 'EN_SERVICE'
  | 'EN_MAINTENANCE'
  | 'EN_PANNE'
  | 'HORS_SERVICE'
  | 'EN_TRANSIT';

export interface Materiel {
  id?: string;
  code: string;               // référence interne, ex: MAT-AUTOLAV-001
  nom: string;
  type: TypeMateriel;
  marque?: string;
  modele?: string;
  numeroSerie?: string;
  dateAcquisition?: string;   // ISO yyyy-MM-dd
  prixAcquisition?: number;   // FCFA

  // Affectation
  siteAffecteId?: string;
  siteAffecteNom?: string;
  statut: StatutMateriel;

  // Maintenance
  intervalleMaintenanceJours?: number;
  derniereMaintenance?: string;
  prochaineMaintenance?: string;

  observations?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TypeEvenementMateriel =
  | 'AFFECTATION'
  | 'MAINTENANCE_PROGRAMMEE'
  | 'PANNE'
  | 'REPARATION'
  | 'REMPLACEMENT'
  | 'MISE_HORS_SERVICE';

export interface EvenementMateriel {
  id?: string;
  materielId: string;
  type: TypeEvenementMateriel;
  date: string;
  description: string;

  // Affectation
  siteAvantId?: string;
  siteApresId?: string;

  // Maintenance / Panne
  cout?: number;              // FCFA
  technicienEmployeId?: string;
  technicienNom?: string;
  duree?: number;             // heures
  resolu?: boolean;

  documents?: string[];       // URLs de PJ (factures, rapports)
  createdAt?: string;
}

export interface MaintenanceProgrammee {
  id?: string;
  materielId: string;
  materielNom?: string;
  dateProgrammee: string;
  type: 'PREVENTIVE' | 'CURATIVE';
  description: string;
  realisee: boolean;
  dateRealisation?: string;
  technicienEmployeId?: string;
  commentaire?: string;
}

export interface FiltreMateriel {
  q?: string;
  type?: TypeMateriel;
  statut?: StatutMateriel;
  siteAffecteId?: string;
}

export interface AlerteMaintenance {
  materielId: string;
  materielCode: string;
  materielNom: string;
  prochaineMaintenance: string;
  joursRestants: number;      // négatif si en retard
  niveau: 'INFO' | 'ATTENTION' | 'CRITIQUE';
}
