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

/* ── Comparaison multi-mois (agrégation CLIENT) ────────────────────────────
 *
 * L'endpoint serveur reste mono-mois : le front appelle `GET /stock/synthese-mensuelle`
 * une fois par mois sélectionné (forkJoin) et fusionne les réponses ici même.
 * Les types ci-dessous ne correspondent à AUCUN DTO backend.
 */

/** Sens de flux retenu à l'affichage — purement cosmétique, aucun impact serveur. */
export type FluxSynthese = 'TOUT' | 'ENTREE' | 'SORTIE';

/** Valeurs d'un produit pour un mois donné. */
export interface CelluleSyntheseMois {
  mois: string;                  // yyyy-MM
  stockInitial: number;
  entrees: number;
  sorties: number;
  stockFinal: number;
  valeurFinale: number;
}

export interface LigneSyntheseMulti {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  unite: UniteStock;
  categorieLibelle?: string;
  parMois: CelluleSyntheseMois[];  // aligné sur SyntheseMultiMois.mois (cellule à zéro si le produit est absent du mois)
  totalEntrees: number;            // cumul sur tous les mois sélectionnés
  totalSorties: number;
  stockFinal: number;              // ⚠ celui du DERNIER mois sélectionné, jamais une somme
  valeurFinale: number;            // ⚠ idem
}

export interface SyntheseMultiMois {
  mois: string[];                  // trié chronologiquement
  siteId?: string;
  siteNom?: string;
  lignes: LigneSyntheseMulti[];
  totauxParMois: TotauxMoisSynthese[];
  totalEntrees: number;
  totalSorties: number;
  valeurStockFinal: number;        // ⚠ celle du dernier mois
}

export interface TotauxMoisSynthese {
  mois: string;
  entrees: number;
  sorties: number;
  valeurStockFinal: number;
}
