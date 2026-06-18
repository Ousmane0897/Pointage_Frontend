/**
 * Modèles du Chantier — Module Stock v2 / 7.5 Analyse des consommations.
 *
 * Le `Chantier` est la SEULE entité persistée introduite par 7.5. Il porte le
 * référentiel léger (référence, nom, site, période, statut) et l'état de clôture.
 * Les consommations elles-mêmes ne sont PAS stockées ici : elles sont agrégées à
 * la volée depuis les bons de sortie `DISTRIBUTION_CHANTIER` rattachés par
 * `chantierId` (cf. stock-v2-bon-sortie.model.ts).
 *
 * Workflow : EN_COURS → CLOTURE (figé). Une fois clôturé, le chantier ne reçoit
 * plus de consommation et son rapport final est généré.
 */

import { UniteStock } from './stock-v2-produit.model';

export type StatutChantier = 'EN_COURS' | 'CLOTURE';

/** Entité Chantier (référentiel léger, persisté). */
export interface Chantier {
  id?: string;
  reference: string;             // référence métier (unique, contrôle serveur)
  nom: string;                   // libellé du chantier
  siteId?: string;               // site rattaché (TerrainSiteClient, lecture seule)
  siteNom?: string;              // dénormalisé
  client?: string;               // client final (texte libre)
  description?: string;          // observations libres
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin?: string;              // ISO yyyy-MM-dd — date de clôture effective
  statut: StatutChantier;
  // Agrégats dénormalisés (calculés serveur, lecture seule)
  coutTotal?: number;            // somme des montants consommés (FCFA)
  nbMouvements?: number;         // nombre de lignes de sortie rattachées
  createdAt?: string;
  updatedAt?: string;
}

/** Payload de création / modification d'un chantier. */
export interface ChantierPayload {
  reference: string;
  nom: string;
  siteId?: string;
  client?: string;
  description?: string;
  dateDebut: string;
}

/** Filtres de la liste des chantiers. */
export interface FiltreChantier {
  q?: string;                    // recherche libre (référence / nom / client)
  statut?: StatutChantier;
  siteId?: string;
  dateDebut?: string;
  dateFin?: string;
}

/** Ligne de consommation agrégée d'un chantier (DTO d'affichage). */
export interface LigneConsommationChantier {
  produitId: string;
  produitCode?: string;
  produitLibelle?: string;
  unite?: UniteStock;
  quantite: number;
  prixUnitaire?: number;         // FCFA
  montant: number;               // quantite × prixUnitaire (FCFA)
  premiereDate?: string;         // première consommation (ISO)
  derniereDate?: string;         // dernière consommation (ISO)
}

/** Détail agrégé d'un chantier (entité + lignes consommées). */
export interface DetailChantier {
  chantier: Chantier;
  lignes: LigneConsommationChantier[];
  coutTotal: number;             // FCFA
  nbProduits: number;
  dureeJours?: number;           // dateDebut → dateFin (ou aujourd'hui si en cours)
}
