/**
 * DTOs financiers — 7.6 Tableau de bord financier des stocks.
 *
 * Agrège la valeur du stock, la consommation, les coûts par site, les marges et
 * les dérives budgétaires. Modèles d'affichage uniquement (calculs serveur).
 * Montants FCFA entiers.
 */

/** Niveau de gravité d'une dérive budgétaire. */
export type GraviteDerive = 'CRITIQUE' | 'ATTENTION';

/** KPIs financiers consolidés. */
export interface KpisFinanciers {
  valeurStock: number;           // FCFA — valeur totale du stock
  valeurConsommeeMois: number;   // FCFA — sorties valorisées du mois
  coutMoyenParSite: number;      // FCFA
  margeGlobale: number;          // FCFA
  tauxMargeMoyen: number;        // %
  nbDerives: number;             // dérives budgétaires détectées
}

/** Point d'évolution de la valeur du stock. */
export interface PointValeurStock {
  mois: string;                  // 'YYYY-MM'
  valeur: number;                // FCFA
}

/** Coût agrégé d'un site (pour le bar chart top sites). */
export interface PointCoutSite {
  siteNom: string;
  cout: number;                  // FCFA
}

/** Répartition de la valeur par catégorie (donut). */
export interface PointRepartitionCategorie {
  categorie: string;
  valeur: number;                // FCFA
}

/** Dérive budgétaire détectée (site ou produit en surconsommation). */
export interface DeriveBudgetaire {
  cible: string;                 // libellé site ou produit
  type: 'SITE' | 'PRODUIT';
  valeurActuelle: number;        // FCFA
  valeurReference: number;       // FCFA
  ecartPct: number;              // %
  gravite: GraviteDerive;
}

/** Rapport complet du tableau de bord financier. */
export interface RapportTableauBordFinancier {
  kpis: KpisFinanciers;
  evolutionValeur: PointValeurStock[];        // line (12 mois)
  coutParSite: PointCoutSite[];               // bar (top 10)
  repartitionCategorie: PointRepartitionCategorie[];  // donut
  derives: DeriveBudgetaire[];
}

export interface FiltreTableauBordFinancier {
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin: string;               // ISO yyyy-MM-dd
  siteId?: string;
  categorieId?: string;
}
