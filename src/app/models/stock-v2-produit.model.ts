/**
 * Modèles du Catalogue produits — Module Stock v2 / 7.3 Stocks & Approvisionnement.
 *
 * Module entièrement neuf et indépendant : aucune réutilisation des modèles
 * de l'ancien stock ni de `production-*` (Production Chimie). Collection MongoDB
 * dédiée côté backend (`stock-v2/produits`).
 */

/** Nature du produit dans le référentiel. */
export type TypeProduit =
  | 'PRODUIT_FINI'
  | 'MATIERE_PREMIERE'
  | 'CONSOMMABLE'
  | 'EPI'
  | 'MATERIEL';

/** Unité de mesure paramétrable (système d'unités multiples). */
export type UniteStock =
  | 'KG'
  | 'G'
  | 'L'
  | 'ML'
  | 'PIECE'
  | 'M2'
  | 'M3'
  | 'METRE'
  | 'CARTON'
  | 'LOT';

export interface Produit {
  id?: string;
  code: string;                  // unique
  libelle: string;
  typeProduit: TypeProduit;
  categorieId?: string;
  categorieLibelle?: string;     // dénormalisé pour affichage rapide
  sousCategorie?: string;        // niveau libre additionnel
  unite: UniteStock;
  fournisseurPrincipal?: string;
  seuilAlerte: number;           // seuil d'alerte global (peut être affiné par site dans EtatStock)
  prixUnitaire: number;          // FCFA — base de valorisation 7.3 (CMUP/FIFO → 7.6)
  photoUrl?: string;
  photoNom?: string;
  ficheTechniqueUrl?: string;
  ficheTechniqueNom?: string;
  ficheTechniqueMimeType?: string;
  quantiteTotale?: number;       // dénormalisé : somme tous sites (affichage liste)
  actif: boolean;
  remarque?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltreProduit {
  q?: string;                    // recherche libre (code / libellé / fournisseur)
  typeProduit?: TypeProduit;
  categorieId?: string;
  fournisseur?: string;
  sousSeuil?: boolean;           // produits sous le seuil d'alerte
  actif?: boolean;
}
