/**
 * Modèles de la Synthèse mensuelle — Module Stock v2 / 7.3.
 *
 * Récapitulatif des mouvements par mois : stock initial, entrées, sorties et
 * stock final par produit, sur un périmètre (site / catégorie) sélectionnable.
 */

import { UniteStock } from './stock-v2-produit.model';

export interface LigneSynthese {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  unite: UniteStock;
  categorieLibelle?: string;
  stockInitial: number;
  entrees: number;
  sorties: number;
  stockFinal: number;            // stockInitial + entrees − sorties
  valeurFinale: number;          // stockFinal × prixUnitaire (FCFA)
}

export interface SyntheseMensuelle {
  mois: string;                  // yyyy-MM
  siteId?: string;
  siteNom?: string;
  lignes: LigneSynthese[];
  totalEntrees: number;
  totalSorties: number;
  valeurStockFinal: number;      // FCFA
}

export interface FiltreSynthese {
  mois: string;                  // yyyy-MM (obligatoire)
  siteId?: string;
  categorieId?: string;
}
