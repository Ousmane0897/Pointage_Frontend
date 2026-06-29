/**
 * DTOs analytiques — 7.5 Comparatif mensuel.
 *
 * Matrice d'évolution mois par mois (lignes = sites ou produits, colonnes = mois).
 * Le serveur calcule l'écart % vs mois précédent et le sens d'alerte selon le
 * seuil de surconsommation paramétré. Modèles d'affichage uniquement.
 */

import { TypeSortie } from './stock-v2-bon-sortie.model';

/** Axe des lignes de la matrice. */
export type AxeComparatif = 'SITE' | 'PRODUIT';

/** Sens d'évolution d'une cellule (pilote la colorimétrie de la heatmap). */
export type SensEvolution = 'HAUSSE' | 'BAISSE' | 'STABLE' | 'ALERTE';

/** Filtres du comparatif. */
export interface FiltreComparatif {
  axe: AxeComparatif;
  dateDebut: string;             // 'YYYY-MM'
  dateFin: string;               // 'YYYY-MM'
  siteId?: string;
  categorieId?: string;
  typeSortie?: TypeSortie;
  seuilPct: number;              // seuil de surconsommation (alerte si écart >)
}

/** Cellule d'un croisement ligne × mois. */
export interface CelluleComparatif {
  mois: string;                  // 'YYYY-MM'
  valeur: number;                // FCFA (montant consommé)
  quantite?: number;
  evolutionPct?: number;         // % vs mois précédent
  sens: SensEvolution;
}

/** Ligne de la matrice (un site ou un produit). */
export interface LigneComparatif {
  cleId: string;                 // siteId ou produitId
  libelle: string;
  cellules: CelluleComparatif[]; // alignées sur `MatriceComparatif.mois`
  total: number;                 // FCFA
  evolutionGlobalePct?: number;  // % premier → dernier mois
  sensGlobal: SensEvolution;
}

/** Série pour le graphe multi-courbes (un site/produit = une courbe). */
export interface SerieComparatif {
  label: string;
  data: number[];                // aligné sur `mois`
}

/** Matrice complète renvoyée par le serveur. */
export interface MatriceComparatif {
  axe: AxeComparatif;
  mois: string[];                // en-têtes de colonnes ('YYYY-MM')
  lignes: LigneComparatif[];
  series: SerieComparatif[];     // multi-courbes
  totauxParMois: number[];       // aligné sur `mois`
  totalGeneral: number;          // FCFA
  nbAlertes: number;             // cellules en surconsommation
}
