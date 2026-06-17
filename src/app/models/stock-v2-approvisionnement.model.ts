/**
 * Modèles de l'Approvisionnement automatique — Module Stock v2 / 7.3.
 *
 * Suggestions de commande calculées à partir du seuil d'alerte ET de la
 * consommation moyenne sur N derniers mois (N paramétrable). Le besoin est :
 *   besoin = seuilAlerte + consommationPrevisionnelle − stockActuel
 * La quantité suggérée est éditable avant génération du bon de commande.
 */

import { UniteStock } from './stock-v2-produit.model';

export interface SuggestionAppro {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  unite: UniteStock;
  fournisseurPrincipal?: string;
  stockActuel: number;
  seuilAlerte: number;
  consommationMoyenne: number;       // moyenne mensuelle sur N mois
  consommationPrevisionnelle: number; // projection sur l'horizon
  besoin: number;                     // calculé serveur (peut être négatif → ignoré)
  quantiteSuggeree: number;           // éditable côté client
  prixUnitaire: number;               // FCFA
  montantEstime: number;              // quantiteSuggeree × prixUnitaire
}

export interface ParametresAppro {
  nMois: number;                      // horizon de consommation (paramétrable)
  siteId?: string;
  categorieId?: string;
  fournisseur?: string;
}

export interface LigneBonCommande {
  produitId: string;
  produitCode: string;
  produitLibelle: string;
  unite: UniteStock;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface BonCommandePrevisionnel {
  fournisseur?: string;
  date: string;                       // ISO yyyy-MM-dd
  lignes: LigneBonCommande[];
  montantTotal: number;               // FCFA
}
