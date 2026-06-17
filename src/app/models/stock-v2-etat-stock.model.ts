/**
 * Modèles de l'État du stock temps réel — Module Stock v2 / 7.3.
 *
 * Vue agrégée des quantités disponibles par produit et par site, avec statut
 * d'alerte calculé à partir du seuil (rupture / critique / OK) et valorisation
 * FCFA dérivée du `prixUnitaire` du produit.
 */

import { TypeProduit, UniteStock } from './stock-v2-produit.model';

export type StatutStock = 'RUPTURE' | 'CRITIQUE' | 'OK';

export interface EtatStock {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  typeProduit: TypeProduit;
  categorieLibelle?: string;
  unite: UniteStock;
  siteId?: string;               // absent = stock consolidé tous sites
  siteNom?: string;
  quantite: number;
  seuilAlerte: number;           // seuil effectif (global produit ou propre au couple produit/site)
  statut: StatutStock;
  prixUnitaire: number;          // FCFA
  valeur: number;                // quantite × prixUnitaire
  dateMaj?: string;              // dernière mise à jour (dernier mouvement)
}

export interface FiltreEtatStock {
  q?: string;
  categorieId?: string;
  typeProduit?: TypeProduit;
  siteId?: string;
  statut?: StatutStock;
  parSite?: boolean;             // true = détail par site, false = consolidé
}

/** Mise à jour d'un seuil d'alerte (global produit ou couple produit/site). */
export interface SeuilPayload {
  produitId: string;
  siteId?: string;
  seuilAlerte: number;
}
