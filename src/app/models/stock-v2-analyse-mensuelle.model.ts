/**
 * DTOs analytiques — 7.5 Vue mensuelle par agence/site.
 *
 * Modèles d'AFFICHAGE uniquement (aucune entité persistée). Les données sont
 * agrégées côté serveur à partir des sorties EFFECTIVES de 7.4 et du catalogue
 * de 7.3. Le coût est valorisé via `Produit.prixUnitaire` (FCFA).
 */

import { UniteStock } from './stock-v2-produit.model';

/** Filtres de la vue mensuelle (un FormGroup pilote toutes les visualisations). */
export interface FiltreAnalyseMensuelle {
  mois: string;                  // mois de début — 'YYYY-MM'
  moisFin?: string;              // mois de fin (plage) — 'YYYY-MM'
  siteId?: string;
  categorieId?: string;
}

/** Ligne détaillée : un produit consommé sur la période. */
export interface LigneConsoMensuelle {
  produitId: string;
  produitCode?: string;
  produitLibelle?: string;
  unite?: UniteStock;
  quantite: number;
  cout: number;                  // FCFA = quantite × prixUnitaire
  quantitePrecedente?: number;   // mois précédent (pour l'évolution)
  coutPrecedent?: number;        // FCFA
  evolutionPct?: number;         // % vs mois précédent (cout)
}

/** Point d'une série temporelle (évolution mensuelle). */
export interface PointEvolutionMensuelle {
  mois: string;                  // 'YYYY-MM'
  cout: number;                  // FCFA
  quantite: number;
}

/** Élément d'un classement (top produits / répartition catégorie). */
export interface ElementReparti {
  libelle: string;
  montant: number;               // FCFA
  quantite?: number;
}

/** KPIs synthétiques de la vue mensuelle. */
export interface KpisConsoMensuelle {
  coutTotal: number;             // FCFA
  quantiteTotale: number;
  nbProduits: number;
  nbMouvements: number;
  evolutionCoutPct?: number;     // % vs période précédente équivalente
}

/** Synthèse complète renvoyée par le serveur pour une période / un site. */
export interface SyntheseConsoMensuelle {
  kpis: KpisConsoMensuelle;
  lignes: LigneConsoMensuelle[];
  evolution: PointEvolutionMensuelle[];      // line chart
  topProduits: ElementReparti[];             // bar chart
  repartitionCategorie: ElementReparti[];    // donut chart
}
