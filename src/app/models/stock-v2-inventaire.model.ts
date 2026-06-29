/**
 * Modèles des Inventaires — Module Stock v2 / 7.3.
 *
 * Workflow : BROUILLON → COMPTAGE → VALIDATION → CLOTURE.
 * L'écart (qtePhysique − qteTheorique) est calculé automatiquement ; une
 * justification devient obligatoire au-delà du seuil paramétrable.
 */

import { UniteStock } from './stock-v2-produit.model';

export type StatutInventaire = 'BROUILLON' | 'COMPTAGE' | 'VALIDATION' | 'CLOTURE';

/** Périmètre de l'inventaire. */
export type PerimetreInventaire = 'TOUS' | 'CATEGORIE' | 'SELECTION';

export interface LigneInventaire {
  produitId: string;
  produitCode?: string;          // dénormalisé
  produitLibelle?: string;       // dénormalisé
  unite?: UniteStock;            // dénormalisé
  qteTheorique: number;          // stock système au lancement du comptage
  qtePhysique?: number | null;   // saisi pendant le comptage
  ecart?: number;                // qtePhysique − qteTheorique (calculé)
  justification?: string;        // requis si |ecart| > seuilEcartJustification
}

export interface Inventaire {
  id?: string;
  reference?: string;            // numéro auto généré côté backend
  libelle: string;
  datePlanifiee: string;         // ISO yyyy-MM-dd
  siteId?: string;
  siteNom?: string;              // dénormalisé
  perimetre: PerimetreInventaire;
  categorieId?: string;          // requis si perimetre = CATEGORIE
  seuilEcartJustification: number;
  statut: StatutInventaire;
  lignes: LigneInventaire[];
  responsable?: string;
  dateCloture?: string;
  commentaire?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Corps de planification (création / édition à l'état BROUILLON). */
export interface InventairePayload {
  libelle: string;
  datePlanifiee: string;
  siteId?: string;
  perimetre: PerimetreInventaire;
  categorieId?: string;
  produitIds?: string[];         // requis si perimetre = SELECTION
  seuilEcartJustification: number;
  commentaire?: string;
}

/** Corps de sauvegarde des comptages (état COMPTAGE). */
export interface ComptagePayload {
  lignes: { produitId: string; qtePhysique: number | null; justification?: string }[];
}

export interface FiltreInventaire {
  q?: string;
  statut?: StatutInventaire;
  siteId?: string;
  dateDebut?: string;
  dateFin?: string;
}
