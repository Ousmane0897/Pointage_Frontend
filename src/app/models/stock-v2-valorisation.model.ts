/**
 * DTOs financiers — 7.6 Valorisation financière (coût unitaire, mouvements, valeur stock).
 *
 * Modèles d'AFFICHAGE et de paramétrage. La logique de calcul lourde (CUMP, dernier
 * prix) est exécutée côté serveur ; les services purs front (`stock-v2-cump`) ne
 * servent qu'à la simulation/dérivation. Montants en FCFA entiers.
 */

import { MouvementStock, TypeMouvement } from './stock-v2-mouvement.model';
import { TypeProduit } from './stock-v2-produit.model';

/** Méthode de calcul du coût unitaire d'un produit. */
export type MethodeValorisation = 'CUMP' | 'DERNIER_PRIX' | 'FIXE';

/** Paramétrage global de la valorisation (méthode appliquée par défaut). */
export interface ParametrageValorisation {
  methodeDefaut: MethodeValorisation;
  updatedAt?: string;
  updatedBy?: string;            // dénormalisé (JWT serveur)
}

export interface ParametrageValorisationPayload {
  methodeDefaut: MethodeValorisation;
}

/** Type d'alerte sur le coût d'un produit. */
export type AlerteCout = 'METHODE_NON_DEFINIE' | 'COUT_ZERO' | 'ECART_ANORMAL';

/** Coût courant d'un produit + méthode effective + alertes. */
export interface CoutProduit {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  typeProduit: TypeProduit;
  categorieLibelle?: string;
  unite?: string;
  coutCourant: number;           // FCFA — coût unitaire courant (calculé ou fixe)
  methodeEffective: MethodeValorisation;  // méthode résolue (override produit ou global)
  methodeProduit?: MethodeValorisation;   // override explicite du produit (null = hérite du global)
  prixVente?: number;            // FCFA — si défini
  quantiteTotale?: number;       // stock total tous sites
  valeurStock?: number;          // FCFA = quantiteTotale × coutCourant
  alertes: AlerteCout[];
  dernierCout?: number;          // coût précédent (pour détecter l'écart anormal)
  dateDernierCalcul?: string;    // ISO
}

export interface FiltreCoutProduit {
  q?: string;
  typeProduit?: TypeProduit;
  categorieId?: string;
  methode?: MethodeValorisation;
  avecAlerte?: boolean;
}

/** Point d'historique du coût unitaire d'un produit. */
export interface PointHistoriqueCout {
  date: string;                  // ISO yyyy-MM-dd
  cout: number;                  // FCFA
  methode: MethodeValorisation;
  reference?: string;            // mouvement/bon à l'origine du recalcul
}

/** Historique complet du coût d'un produit (pour le line chart). */
export interface HistoriqueCoutProduit {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  points: PointHistoriqueCout[];
}

/** Mouvement valorisé (fonctionnalité 2). `estEstime` = coût reconstitué (mouvement sans snapshot). */
export interface LigneCoutMouvement {
  mouvement: MouvementStock;
  coutUnitaire: number;          // FCFA — snapshot, ou coût courant si fallback
  valeur: number;                // FCFA = quantite × coutUnitaire
  estEstime: boolean;            // true si reconstitué (pas de snapshot historique)
}

export interface FiltreCoutMouvement {
  q?: string;                    // n° bon / lot / référence
  produitId?: string;
  type?: TypeMouvement;
  siteId?: string;
  dateDebut?: string;
  dateFin?: string;
}

// ─── Valeur du stock temps réel (fonctionnalité 3) ──────────────────────────

export type PeriodeComparaison = 'JOUR' | 'SEMAINE' | 'MOIS';

export interface ElementValeurCategorie {
  categorie: string;             // libellé du type / catégorie produit
  valeur: number;                // FCFA
  quantite?: number;
}

export interface LigneValeurProduit {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  categorieLibelle?: string;
  quantite: number;
  coutUnitaire: number;          // FCFA
  valeur: number;                // FCFA
}

export interface KpisValeurStock {
  valeurTotale: number;          // FCFA
  nbProduits: number;
  valeurPrecedente?: number;     // FCFA — instant T précédent
  ecartValeur?: number;          // FCFA = valeurTotale − valeurPrecedente
  ecartPct?: number;             // %
}

export interface ValeurStock {
  kpis: KpisValeurStock;
  repartitionCategorie: ElementValeurCategorie[];  // donut
  lignes: LigneValeurProduit[];
  dateCalcul: string;            // ISO complet — horodatage du snapshot
}

export interface FiltreValeurStock {
  siteId?: string;
  categorieId?: string;
  comparer?: PeriodeComparaison;
}
