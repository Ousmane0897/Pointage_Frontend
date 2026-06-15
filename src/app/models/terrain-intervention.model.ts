/**
 * Modèles pour les Fiches d'Intervention — Module Exploitation Terrain (5.2).
 *
 * Une fiche d'intervention est le rapport de passage rempli par l'agent sur
 * un site : checklist des tâches (dérivée du cahier des charges du site),
 * produits utilisés, observations, photos avant/après, signature numérique
 * du client. Exportable en PDF pour archivage et envoi.
 */

import { PositionGps } from './terrain-pointage.model';

export type StatutIntervention =
  | 'BROUILLON'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'VALIDEE'                 // signée par le client
  | 'ANNULEE';

export interface TacheChecklist {
  libelle: string;
  fait: boolean;
  observation?: string;
}

export interface ProduitUtilise {
  nom: string;
  quantite: number;
  unite: string;              // L, mL, kg, g, unité
  reference?: string;         // code interne ou homologation
}

export interface PhotoIntervention {
  nomFichier: string;
  url?: string;
  mimeType?: string;
  tailleOctets?: number;
  moment: 'AVANT' | 'APRES' | 'AUTRE';
  legende?: string;
}

export interface SignatureClient {
  nom: string;
  fonction?: string;
  dataUrl: string;            // PNG base64 du canvas signature_pad
  date: string;               // ISO
}

export interface FicheIntervention {
  id?: string;
  numero: string;             // ex: INT-20260526-001

  // Contexte
  siteId: string;
  siteCode?: string;
  siteNom?: string;
  affectationId?: string;

  // Agent
  employeId: string;
  employeMatricule?: string;
  employeNom?: string;

  dateDebut: string;          // ISO
  dateFin?: string;
  duree?: number;             // minutes
  positionDebut?: PositionGps;
  positionFin?: PositionGps;

  taches: TacheChecklist[];
  produits: ProduitUtilise[];
  observations?: string;
  photos: PhotoIntervention[];

  signatureClient?: SignatureClient;

  statut: StatutIntervention;

  createdAt?: string;
  updatedAt?: string;
}

export interface FiltreIntervention {
  dateDebut?: string;
  dateFin?: string;
  siteId?: string;
  employeId?: string;
  statut?: StatutIntervention;
}
