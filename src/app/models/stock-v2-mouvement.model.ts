/**
 * Modèles des Mouvements de stock — Module Stock v2 / 7.3 Stocks & Approvisionnement.
 *
 * Entrées (achats, production), sorties (consommation, vente) et transferts
 * inter-sites. Les sites sont des `SiteClient` consommés en LECTURE SEULE
 * depuis `TerrainSiteClientService` (référencés par id, dénormalisés en nom).
 */

import { UniteStock } from './stock-v2-produit.model';

export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'TRANSFERT';

export type MotifMouvement =
  | 'ACHAT'
  | 'PRODUCTION'
  | 'CONSOMMATION'
  | 'VENTE'
  | 'TRANSFERT'
  | 'AJUSTEMENT'
  | 'RETOUR'
  | 'PERTE';

export interface MouvementStock {
  id?: string;
  reference?: string;            // numéro auto généré côté backend
  produitId: string;
  produitCode?: string;          // dénormalisé
  produitLibelle?: string;       // dénormalisé
  unite?: UniteStock;            // dénormalisé
  type: TypeMouvement;
  motif: MotifMouvement;
  quantite: number;
  siteSourceId?: string;         // requis pour SORTIE / TRANSFERT
  siteSourceNom?: string;        // dénormalisé
  siteDestinationId?: string;    // requis pour ENTREE / TRANSFERT
  siteDestinationNom?: string;   // dénormalisé
  date: string;                  // ISO yyyy-MM-dd ou complet
  utilisateur?: string;          // dénormalisé (renseigné côté serveur via JWT)
  commentaire?: string;
  createdAt?: string;
}

/** Corps envoyé à la création (le serveur déduit l'utilisateur du JWT). */
export interface MouvementPayload {
  produitId: string;
  type: TypeMouvement;
  motif: MotifMouvement;
  quantite: number;
  siteSourceId?: string;
  siteDestinationId?: string;
  date: string;
  commentaire?: string;
}

export interface FiltreMouvement {
  q?: string;                    // recherche libre (référence / produit)
  produitId?: string;
  type?: TypeMouvement;
  motif?: MotifMouvement;
  siteId?: string;               // source OU destination
  dateDebut?: string;
  dateFin?: string;
}
