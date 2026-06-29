/**
 * Modèles des Plafonds de dotation — Module Stock v2 / 7.4 (fonctionnalité 7).
 *
 * Un plafond fixe une quantité mensuelle maximale par site, ciblant soit un
 * produit précis, soit une catégorie entière. La consommation réelle est
 * agrégée côté serveur depuis les sorties EFFECTIVES ; un dépassement déclenche
 * une alerte (toast + notification WebSocket au superviseur).
 */

import { UniteStock } from './stock-v2-produit.model';

/** Granularité du plafond : par produit ou par catégorie. */
export type GranularitePlafond = 'PRODUIT' | 'CATEGORIE';

export interface Plafond {
  id?: string;
  siteId: string;
  siteNom?: string;              // dénormalisé
  granularite: GranularitePlafond;
  cibleId: string;              // produitId ou categorieId selon granularite
  cibleLibelle?: string;       // dénormalisé (libellé produit ou catégorie)
  unite?: UniteStock;          // dénormalisé si granularite = PRODUIT
  plafondMensuel: number;      // quantité maximale par mois
  actif: boolean;
  commentaire?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlafondPayload {
  siteId: string;
  granularite: GranularitePlafond;
  cibleId: string;
  plafondMensuel: number;
  actif: boolean;
  commentaire?: string;
}

export interface FiltrePlafond {
  q?: string;
  siteId?: string;
  granularite?: GranularitePlafond;
  actif?: boolean;
}

/** Consommation observée vs plafond pour un mois donné (données de jauge). */
export interface ConsommationPlafond {
  plafondId: string;
  siteId: string;
  siteNom?: string;
  granularite: GranularitePlafond;
  cibleId: string;
  cibleLibelle?: string;
  unite?: UniteStock;
  plafondMensuel: number;
  consomme: number;            // quantité consommée sur le mois
  pourcentage: number;         // consomme / plafondMensuel × 100
  depassement: boolean;        // consomme > plafondMensuel
  mois: string;                // YYYY-MM
}
