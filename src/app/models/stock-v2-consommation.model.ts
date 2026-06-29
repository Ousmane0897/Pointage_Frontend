/**
 * Modèles de l'analyse de consommation — Module Stock v2 / 7.4.
 *
 * Couvre :
 *  - les statistiques d'usage par catégorie d'entrée/sortie (fonctionnalités 1 & 2) ;
 *  - l'historique de consommation par destinataire (fonctionnalité 6) ;
 *  - les rapports de consommation par site / produit / période (fonctionnalité 9).
 *
 * Toutes les données sont agrégées côté serveur depuis les mouvements EFFECTIFS.
 */

import { UniteStock } from './stock-v2-produit.model';

/** Sens de la catégorisation pour les statistiques d'usage. */
export type SensCategorisation = 'ENTREE' | 'SORTIE';

/** Statistique d'usage d'une catégorie (entrée ou sortie). */
export interface StatistiqueCategorie {
  code: string;                // valeur de TypeEntree | TypeSortie
  libelle: string;             // libellé résolu (côté client via constantes)
  nombre: number;              // nb de bons / mouvements de cette catégorie
  volume: number;              // somme des quantités
  montant: number;             // somme valorisée (FCFA)
  pourcentage: number;         // part du volume sur le total (0-100)
}

/** Point d'évolution temporelle (graphique). */
export interface PointEvolution {
  periode: string;             // ex 'YYYY-MM'
  quantite: number;
  montant: number;
}

export interface LigneConsommationDestinataire {
  produitId: string;
  produitCode?: string;
  produitLibelle?: string;
  unite?: UniteStock;
  quantite: number;
  montant: number;
}

/** Consommation cumulée d'un destinataire (site / agence / client). */
export interface ConsommationDestinataire {
  destinataireId: string;
  destinataireNom: string;
  typeDestinataire: string;    // SITE | AGENT | CLIENT
  quantiteTotale: number;
  montantTotal: number;
  nbSorties: number;
  evolution: PointEvolution[];
  lignes?: LigneConsommationDestinataire[];
}

export interface FiltreConsommation {
  siteId?: string;
  produitId?: string;
  dateDebut?: string;
  dateFin?: string;
}

// ─── Rapports de consommation (fonctionnalité 9) ────────────────────────────

export type TypeRapportConsommation = 'PAR_SITE' | 'PAR_PRODUIT' | 'PAR_PERIODE';

export interface LigneRapportConsommation {
  cle: string;                 // identifiant de la ligne (site / produit / période)
  libelle: string;
  quantite: number;
  montant: number;
  nbMouvements: number;
}

export interface RapportConsommation {
  type: TypeRapportConsommation;
  dateDebut: string;
  dateFin: string;
  siteNom?: string;            // si filtré sur un site
  produitLibelle?: string;     // si filtré sur un produit
  lignes: LigneRapportConsommation[];
  quantiteTotale: number;
  montantTotal: number;
  nbMouvementsTotal: number;
  coutMoyenParMouvement: number;
}

export interface FiltreRapportConsommation {
  type: TypeRapportConsommation;
  dateDebut: string;
  dateFin: string;
  siteId?: string;
  produitId?: string;
  categorieId?: string;
}
