/**
 * DTOs financiers — 7.6 Marge produits vendus.
 *
 * Croise le prix de vente du produit (7.6) avec son coût de revient (CUMP/dernier
 * prix) et les quantités vendues (sorties `VENTE_PRODUIT`) sur une période.
 * Montants FCFA entiers ; taux en %.
 */

import { TypeProduit } from './stock-v2-produit.model';

/** Marge d'un produit vendu sur la période. */
export interface MargeProduit {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  typeProduit: TypeProduit;
  categorieLibelle?: string;
  prixVente: number;             // FCFA — prix de vente unitaire
  coutRevient: number;           // FCFA — coût unitaire courant
  margeUnitaire: number;         // FCFA = prixVente − coutRevient
  tauxMarge: number;             // % = margeUnitaire / prixVente × 100
  quantiteVendue: number;        // sorties VENTE_PRODUIT sur la période
  margeGlobale: number;          // FCFA = margeUnitaire × quantiteVendue
  rentable: boolean;             // false si marge négative ou taux < seuil
}

/** Synthèse des marges sur la période. */
export interface SyntheseMarges {
  lignes: MargeProduit[];
  margeGlobaleTotale: number;    // FCFA
  chiffreAffaires: number;       // FCFA — Σ prixVente × quantiteVendue
  coutTotal: number;             // FCFA — Σ coutRevient × quantiteVendue
  tauxMargeMoyen: number;        // %
  nbProduitsNonRentables: number;
  dateDebut: string;
  dateFin: string;
}

export interface FiltreMarge {
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin: string;               // ISO yyyy-MM-dd
  categorieId?: string;
}
