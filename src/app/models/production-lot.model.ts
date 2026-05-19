/**
 * Modèles pour les Lots produits & Traçabilité — Module Production Chimie (5.1).
 *
 * Un lot est généré automatiquement à la terminaison d'un OF. Le numéro suit
 * le format AAAAMMJJ-XXX (XXX = compteur séquentiel quotidien, géré
 * atomiquement côté backend via la collection compteurs_lots).
 *
 * La date de péremption est calculée à partir de la durée de péremption
 * définie dans la fiche de formulation (version utilisée).
 */

import { Unite } from './production-matiere-premiere.model';
import { ConsommationMp } from './production-ordre-fabrication.model';
import { VersionFormulation } from './production-formulation.model';

export type StatutControleLot =
  | 'EN_ATTENTE_CONTROLE'
  | 'VALIDE'
  | 'REJETE';

export type StatutStockLot =
  | 'EN_PRODUCTION'   // tant que l'OF n'est pas terminé
  | 'EN_STOCK'        // contrôle qualité validé → entré en stock chimie produits finis
  | 'BLOQUE'          // rejet contrôle qualité
  | 'EXPEDIE'
  | 'PERIME';

export interface Lot {
  id?: string;
  numero: string;                // AAAAMMJJ-XXX
  ordreFabricationId: string;
  ordreFabricationNumero?: string;
  produitNom: string;
  formulationId: string;
  formulationCode?: string;
  formulationVersion: number;
  dateFabrication: string;       // ISO yyyy-MM-dd
  datePeremption: string;
  quantiteProduite: number;
  uniteProduite: Unite;
  statutControle: StatutControleLot;
  controleQualiteId?: string;
  statutStock: StatutStockLot;
  commentaire?: string;
  createdAt?: string;
}

export interface FiltreLot {
  q?: string;                    // recherche par numéro lot ou produit
  produitNom?: string;
  formulationId?: string;
  statutControle?: StatutControleLot;
  statutStock?: StatutStockLot;
  dateDebut?: string;
  dateFin?: string;
}

export interface TracabiliteLot {
  lot: Lot;
  ordreFabrication: {
    id: string;
    numero: string;
    operateurNom?: string;
    dateLancementEffective?: string;
    dateFin?: string;
  };
  formulation: {
    id: string;
    code: string;
    nom: string;
    version: VersionFormulation;
  };
  consommationsMp: ConsommationMp[];
  controleQualiteId?: string;
}
