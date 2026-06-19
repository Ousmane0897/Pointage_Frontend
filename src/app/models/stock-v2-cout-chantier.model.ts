/**
 * DTOs financiers — 7.6 Coût de revient par chantier.
 *
 * Valorise les consommations rattachées à un chantier (entité 7.5) au COÛT de
 * revient (et non au prix de consommation), pour la facturation client / analyse
 * de rentabilité. Réutilise l'entité Chantier de 7.5 en lecture. Montants FCFA.
 */

import { Chantier, StatutChantier } from './stock-v2-chantier.model';
import { UniteStock } from './stock-v2-produit.model';

/** Ligne de coût de revient (un produit consommé sur le chantier). */
export interface LigneCoutChantier {
  produitId: string;
  produitCode?: string;
  produitLibelle?: string;
  unite?: UniteStock;
  quantite: number;
  coutUnitaire: number;          // FCFA — coût de revient unitaire
  montant: number;               // FCFA = quantite × coutUnitaire
  estEstime?: boolean;           // true si coût reconstitué (mouvement sans snapshot)
}

/** Détail valorisé d'un chantier (coût de revient). */
export interface CoutRevientChantier {
  chantier: Chantier;
  lignes: LigneCoutChantier[];
  coutTotal: number;             // FCFA
  nbProduits: number;
  dureeJours?: number;
  coutParJour?: number;          // FCFA = coutTotal / dureeJours
  coutMoyenChantiersSimilaires?: number;  // FCFA — base de comparaison
  ecartPct?: number;             // % vs chantiers similaires
}

/** Ligne de la liste des chantiers valorisés. */
export interface ChantierValorise {
  id: string;
  reference: string;
  nom: string;
  siteNom?: string;
  statut: StatutChantier;
  dateDebut: string;
  dateFin?: string;
  coutTotal: number;             // FCFA
  nbProduits: number;
  coutParJour?: number;          // FCFA
}

export interface FiltreCoutChantier {
  q?: string;
  statut?: StatutChantier;
  siteId?: string;
  dateDebut?: string;
  dateFin?: string;
}
