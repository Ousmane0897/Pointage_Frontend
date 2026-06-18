/**
 * DTOs analytiques — 7.5 Filtres croisés (analyse multidimensionnelle).
 *
 * Construction d'une requête pivot (axe lignes × axe colonnes, mesure montant ou
 * quantité) sur les sorties de 7.4. Le serveur renvoie un tableau pivot avec
 * totaux de marges. Les requêtes favorites sont persistées en localStorage
 * (aucun endpoint). Modèles d'affichage uniquement.
 */

import { TypeSortie } from './stock-v2-bon-sortie.model';

/** Axes d'analyse disponibles (lignes / colonnes). */
export type AxeAnalyse =
  | 'PRODUIT'
  | 'CATEGORIE'
  | 'SITE'
  | 'TYPE_SORTIE'
  | 'NATURE_DON'
  | 'MOIS';

/** Mesure agrégée. */
export type MesureAnalyse = 'MONTANT' | 'QUANTITE';

/** Filtres optionnels d'une requête croisée. */
export interface FiltreCroise {
  siteId?: string;
  produitId?: string;
  categorieId?: string;
  typeSortie?: TypeSortie;
}

/** Définition d'une requête croisée. */
export interface RequeteCroisee {
  axeLignes: AxeAnalyse;
  axeColonnes?: AxeAnalyse;       // optionnel — sinon table à une dimension
  mesure: MesureAnalyse;
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin: string;               // ISO yyyy-MM-dd
  filtres: FiltreCroise;
}

/** Requête favorite (persistée en localStorage). */
export interface RequeteFavorite {
  id: string;                    // identifiant local (timestamp/uuid client)
  nom: string;
  requete: RequeteCroisee;
}

/** Ligne du tableau pivot. */
export interface LignePivot {
  libelle: string;
  valeurs: number[];             // alignées sur `ResultatCroise.entetesColonnes`
  total: number;                 // total de la ligne (marge)
}

/** Résultat d'une requête croisée (tableau pivot). */
export interface ResultatCroise {
  mesure: MesureAnalyse;
  entetesColonnes: string[];     // libellés de colonnes (vide si table 1D)
  lignes: LignePivot[];
  totauxColonnes: number[];      // marges par colonne
  totalGeneral: number;
}
