/**
 * Modèles du Tableau de bord stocks — Module Stock v2 / 7.3.
 *
 * KPIs agrégés + séries pour les graphiques ng2-charts (valeur par catégorie,
 * évolution mensuelle de la valeur, top consommations, produits dormants).
 */

import { UniteStock } from './stock-v2-produit.model';

export interface KpisStock {
  valeurTotale: number;          // FCFA
  nbProduits: number;
  nbRupture: number;
  nbAlerte: number;              // sous seuil critique (hors rupture)
  tauxRotationMoyen: number;     // sorties / stock moyen sur la période
  nbDormants: number;            // produits sans mouvement depuis N mois
}

export interface PointValeurCategorie {
  categorie: string;
  valeur: number;                // FCFA
}

export interface PointEvolution {
  mois: string;                  // yyyy-MM
  valeur: number;                // FCFA
}

export interface PointConsommation {
  produitLibelle: string;
  quantite: number;
  unite: UniteStock;
}

export interface ProduitDormant {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  dernierMouvement?: string;     // ISO ; absent = jamais mouvementé
  quantite: number;
  valeur: number;                // FCFA
}

export interface RapportTableauBordStock {
  kpis: KpisStock;
  valeurParCategorie: PointValeurCategorie[];
  evolutionValeur: PointEvolution[];
  topConsommations: PointConsommation[];
  produitsDormants: ProduitDormant[];
}

export interface FiltreTableauBordStock {
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin: string;               // ISO yyyy-MM-dd
  siteId?: string;
  categorieId?: string;
  moisDormance?: number;         // seuil de dormance (mois)
}
