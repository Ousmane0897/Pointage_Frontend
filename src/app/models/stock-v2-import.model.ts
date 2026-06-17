/**
 * Modèles d'import Excel des produits — Module Stock v2 / 7.3.
 *
 * Réplique du pattern d'import des dossiers employés (RH) : validation
 * ligne-par-ligne fail-soft, rapport d'erreurs exportable, import bulk
 * transactionnel (all-or-nothing) côté serveur.
 */

import { TypeProduit, UniteStock } from './stock-v2-produit.model';

export interface ProduitImportPayload {
  numeroLigne: number;
  code: string;
  libelle: string;
  typeProduit: TypeProduit;
  categorieLibelle?: string;     // le backend résout/crée la catégorie par libellé
  sousCategorie?: string;
  unite: UniteStock;
  fournisseurPrincipal?: string;
  seuilAlerte: number;
  prixUnitaire: number;
  stockInitial?: number;         // mouvement d'entrée initial éventuel
  actif: boolean;
  remarque?: string;
}

export interface ProduitBulkPayload {
  produits: ProduitImportPayload[];
}

export interface ErreurImport {
  numeroLigne: number;
  colonne: string;
  valeurRecue: unknown;
  message: string;
}

export interface LigneImport {
  numeroLigne: number;
  brut: Record<string, unknown>;
  payload?: ProduitImportPayload;
  erreurs: ErreurImport[];
}

export interface ResultatValidation {
  lignes: LigneImport[];
  total: number;
  valides: number;
  enErreur: number;
  erreurs: ErreurImport[];
}

export interface EchecImport {
  numeroLigne: number;
  code: string;
  message: string;
}

export interface ResultatImport {
  succes: number;
  echecs: EchecImport[];
}

/**
 * Forme exacte renvoyée par le backend (POST /stock-v2/produits/bulk).
 * Mappée vers `ResultatImport` dans `StockV2ProduitService.importerBulk()`.
 */
export interface BackendBulkImportResponse {
  total: number;
  inserted: number;
  failed: number;
  insertedIds: string[];
  errors: BackendBulkImportError[];
}

export interface BackendBulkImportError {
  lineNumber?: number;
  numeroLigne?: number;
  code?: string;
  message?: string;
  field?: string;
}

export const COLONNES_TEMPLATE_PRODUIT: readonly string[] = [
  'Code *',
  'Libellé *',
  'Type *',
  'Catégorie',
  'Sous-catégorie',
  'Unité *',
  'Fournisseur principal',
  "Seuil d'alerte *",
  'Prix unitaire (FCFA) *',
  'Stock initial',
  'Actif',
  'Remarque',
] as const;
