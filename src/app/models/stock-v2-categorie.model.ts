/**
 * Modèles des Catégories produits (arborescence multi-niveaux) —
 * Module Stock v2 / 7.3 Stocks & Approvisionnement.
 *
 * Catégorisation hiérarchique (catégorie / sous-catégorie / sous-sous…) via
 * `parentId`. L'arbre est exploré paresseusement (lazy expand) : on charge les
 * racines puis les enfants d'un nœud à la demande.
 */

export interface CategorieStock {
  id?: string;
  libelle: string;
  parentId?: string | null;      // null/absent = catégorie racine
  niveau: number;                // 0 = racine, 1 = sous-catégorie, etc.
  nbEnfants?: number;            // dénormalisé : nb de catégories filles (pour l'expand)
  nbProduits?: number;           // dénormalisé : nb de produits rattachés
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Nœud d'arbre côté client (état d'affichage lazy). */
export interface NoeudCategorie extends CategorieStock {
  enfants?: NoeudCategorie[];
  charge: boolean;               // enfants déjà chargés ?
  deplie: boolean;               // nœud développé ?
  chargement?: boolean;          // chargement des enfants en cours ?
}

export interface CategoriePayload {
  libelle: string;
  parentId?: string | null;
  description?: string;
}

export interface FiltreCategorie {
  q?: string;
  parentId?: string | null;
}
