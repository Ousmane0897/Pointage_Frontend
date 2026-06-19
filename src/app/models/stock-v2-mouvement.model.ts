/**
 * Modèles des Mouvements de stock — Module Stock v2 / 7.3 Stocks & Approvisionnement.
 *
 * Entrées (achats, production), sorties (consommation, vente) et transferts
 * inter-sites. Les sites sont des `SiteClient` consommés en LECTURE SEULE
 * depuis `TerrainSiteClientService` (référencés par id, dénormalisés en nom).
 */

import { UniteStock } from './stock-v2-produit.model';
import { TypeEntree } from './stock-v2-bon-entree.model';
import { TypeSortie } from './stock-v2-bon-sortie.model';

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

  // ─── Enrichissement 7.4 Contrôle des mouvements (optionnels) ───────────────
  // Un mouvement peut être créé directement (origine DIRECT, comportement 7.3)
  // ou généré par la validation d'un bon (origine BON). Ces champs sont
  // renseignés côté serveur lors de la génération depuis un bon EFFECTIF.
  origine?: 'DIRECT' | 'BON';
  bonId?: string;                // id du bon d'entrée/sortie source
  bonReference?: string;         // BE-/BS-AAAAMMJJ-XXX
  categorieEntree?: TypeEntree;  // catégorie typée si type = ENTREE via bon
  categorieSortie?: TypeSortie;  // catégorie typée si type = SORTIE via bon

  // ─── Enrichissement 7.6 Valorisation financière (optionnels) ───────────────
  // Coût unitaire GELÉ au moment du mouvement (traçabilité financière historique,
  // renseigné côté serveur). Les mouvements antérieurs à 7.6 n'ont pas de snapshot :
  // les vues financières reconstituent alors le coût courant (drapeau `estEstime`).
  coutUnitaireSnapshot?: number; // FCFA — coût unitaire au moment du mouvement
  valeurMouvement?: number;      // FCFA = quantite × coutUnitaireSnapshot
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
  bonId?: string;                // mouvements générés par un bon donné (7.4)
}
