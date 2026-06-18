/**
 * Modèles de la Dotation prévue vs réelle — Module Stock v2 / 7.4 (fonctionnalité 8).
 *
 * Comparatif mensuel entre la dotation planifiée (plafonds) et la distribution
 * réellement effectuée (sorties EFFECTIVES), avec mise en évidence des écarts
 * (sur-consommation / sous-consommation) par site et par produit.
 */

import { UniteStock } from './stock-v2-produit.model';

/** Sens de l'écart dotation prévue / réelle. */
export type SensEcartDotation = 'SUR_CONSOMMATION' | 'SOUS_CONSOMMATION' | 'CONFORME';

export interface LigneComparatifDotation {
  siteId: string;
  siteNom?: string;
  produitId: string;
  produitCode?: string;
  produitLibelle?: string;
  unite?: UniteStock;
  prevu: number;               // dotation planifiée (plafond mensuel)
  reel: number;                // distribution réellement effectuée
  ecart: number;               // reel − prevu
  pourcentageEcart: number;    // (reel − prevu) / prevu × 100 (0 si prevu = 0)
  sens: SensEcartDotation;
}

export interface ComparatifDotation {
  mois: string;                // YYYY-MM
  lignes: LigneComparatifDotation[];
  totalPrevu: number;
  totalReel: number;
}

export interface FiltreDotation {
  mois: string;                // YYYY-MM (obligatoire)
  siteId?: string;
  produitId?: string;
}
