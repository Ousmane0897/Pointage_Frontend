/**
 * Modèles du Bon d'entrée numérique — Module Stock v2 / 7.4.
 *
 * Document multi-lignes numéroté (BE-AAAAMMJJ-XXX, séquence atomique serveur).
 * Une fois VALIDE/EFFECTIF, le backend génère les `MouvementStock` (type ENTREE)
 * correspondants qui mettent à jour l'`EtatStock` de 7.3.
 */

import { UniteStock } from './stock-v2-produit.model';
import { StatutBon, HistoriqueWorkflow } from './stock-v2-workflow.model';

/** Catégorisation stricte des entrées (enum figé — cf. stock.constants.ts). */
export type TypeEntree =
  | 'ACHAT_FOURNISSEUR'
  | 'RETOUR_PRODUCTION'
  | 'TRANSFERT_INTER_SITES'
  | 'REINTEGRATION';

export interface LigneBonEntree {
  produitId: string;
  produitCode?: string;      // dénormalisé
  produitLibelle?: string;   // dénormalisé
  unite?: UniteStock;        // dénormalisé
  quantite: number;
  prixUnitaire?: number;     // dénormalisé (FCFA) — valorisation indicative
  montant?: number;          // dénormalisé = quantite × prixUnitaire
}

export interface BonEntree {
  id?: string;
  reference?: string;            // BE-AAAAMMJJ-XXX (auto serveur)
  type: TypeEntree;
  date: string;                  // ISO yyyy-MM-dd
  siteDestinationId: string;     // site qui reçoit
  siteDestinationNom?: string;   // dénormalisé
  fournisseur?: string;          // fournisseur / source (texte libre)
  referenceCommande?: string;
  lignes: LigneBonEntree[];
  statut: StatutBon;
  demandeurId?: string;
  demandeurNom?: string;         // dénormalisé
  validateurId?: string;
  validateurNom?: string;        // dénormalisé
  commentaire?: string;          // note libre du bon
  motifRefus?: string;           // renseigné si REFUSE
  historique?: HistoriqueWorkflow[];
  montantTotal?: number;         // dénormalisé
  createdAt?: string;
  updatedAt?: string;
}

/** Ligne envoyée à la création/modification (le serveur dénormalise le reste). */
export interface LigneBonEntreePayload {
  produitId: string;
  quantite: number;
}

export interface BonEntreePayload {
  type: TypeEntree;
  date: string;
  siteDestinationId: string;
  fournisseur?: string;
  referenceCommande?: string;
  lignes: LigneBonEntreePayload[];
  demandeurId?: string;
  commentaire?: string;
}

export interface FiltreBonEntree {
  q?: string;                    // recherche libre (référence / fournisseur)
  statut?: StatutBon;
  type?: TypeEntree;
  siteId?: string;               // site destination
  dateDebut?: string;
  dateFin?: string;
}
