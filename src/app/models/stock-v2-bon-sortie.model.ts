/**
 * Modèles du Bon de sortie numérique — Module Stock v2 / 7.4.
 *
 * Document multi-lignes numéroté (BS-AAAAMMJJ-XXX, séquence atomique serveur).
 * Une fois VALIDE/EFFECTIF, le backend génère les `MouvementStock` (type SORTIE)
 * correspondants qui décrémentent l'`EtatStock` de 7.3.
 *
 * Le destinataire référence un site (TerrainSiteClient, lecture seule), un agent
 * (DossierEmploye, lecture seule) ou un client externe (texte libre — module
 * Vente futur).
 */

import { UniteStock } from './stock-v2-produit.model';
import { StatutBon, HistoriqueWorkflow } from './stock-v2-workflow.model';

/** Catégorisation stricte des sorties (enum figé — cf. stock.constants.ts). */
export type TypeSortie =
  | 'DISTRIBUTION_AGENCE_SITE_CLIENT'
  | 'DISTRIBUTION_CHANTIER'
  | 'VENTE_PRODUIT'
  | 'CONSOMMATION_INTERNE';

export type TypeDestinataire = 'SITE' | 'AGENT' | 'CLIENT';

export interface Destinataire {
  type: TypeDestinataire;
  siteId?: string;           // si SITE — référentiel TerrainSiteClient (lecture seule)
  siteNom?: string;          // dénormalisé
  agentId?: string;          // si AGENT — DossierEmploye (lecture seule)
  agentNom?: string;         // dénormalisé
  clientNom?: string;        // si CLIENT — texte libre (module Vente futur)
}

export interface LigneBonSortie {
  produitId: string;
  produitCode?: string;      // dénormalisé
  produitLibelle?: string;   // dénormalisé
  unite?: UniteStock;        // dénormalisé
  quantite: number;
  prixUnitaire?: number;     // dénormalisé (FCFA)
  montant?: number;          // dénormalisé = quantite × prixUnitaire
}

export interface BonSortie {
  id?: string;
  reference?: string;            // BS-AAAAMMJJ-XXX (auto serveur)
  type: TypeSortie;
  date: string;                  // ISO yyyy-MM-dd
  siteSourceId: string;          // site d'où sort le stock
  siteSourceNom?: string;        // dénormalisé
  destinataire: Destinataire;
  motif?: string;                // motif de la sortie (texte libre)
  lignes: LigneBonSortie[];
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

export interface LigneBonSortiePayload {
  produitId: string;
  quantite: number;
}

export interface DestinatairePayload {
  type: TypeDestinataire;
  siteId?: string;
  agentId?: string;
  clientNom?: string;
}

export interface BonSortiePayload {
  type: TypeSortie;
  date: string;
  siteSourceId: string;
  destinataire: DestinatairePayload;
  motif?: string;
  lignes: LigneBonSortiePayload[];
  demandeurId?: string;
  commentaire?: string;
}

export interface FiltreBonSortie {
  q?: string;                    // recherche libre (référence / destinataire)
  statut?: StatutBon;
  type?: TypeSortie;
  siteId?: string;               // site source
  dateDebut?: string;
  dateFin?: string;
}
