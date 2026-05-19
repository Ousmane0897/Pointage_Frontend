/**
 * Modèles pour les Ordres de Fabrication (OF) — Module Production Chimie (5.1).
 *
 * Un OF orchestre la production d'un lot : il référence une fiche de
 * formulation (avec sa version), une quantité cible, un opérateur, et passe
 * par un workflow EN_ATTENTE → EN_COURS → TERMINE (ou ANNULE).
 *
 * - Au passage EN_COURS : déclenche les sorties de stock chimie pour les MP.
 * - Au passage TERMINE  : génère automatiquement un lot (AAAAMMJJ-XXX).
 */

import { Unite } from './production-matiere-premiere.model';

export type StatutOf = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';

export interface ChangementStatut {
  statutPrecedent: StatutOf;
  statutNouveau: StatutOf;
  date: string;                  // ISO
  auteurId?: string;
  auteurNom?: string;
  commentaire?: string;
}

export interface ConsommationMp {
  matierePremiereId: string;
  matierePremiereNom?: string;
  unite: Unite;
  quantiteTheorique: number;
  quantiteReelle?: number;       // saisie possible au moment du lancement/terminaison
  lotFournisseurUtilise?: string;
  mouvementStockId?: string;     // référence à la sortie créée
}

export interface DisponibiliteMp {
  matierePremiereId: string;
  matierePremiereNom: string;
  unite: Unite;
  quantiteNecessaire: number;
  quantiteDisponible: number;
  suffisant: boolean;
}

export interface DisponibiliteOf {
  ordreFabricationId?: string;
  formulationId: string;
  quantiteCible: number;
  mp: DisponibiliteMp[];
  lancementPossible: boolean;
}

export interface OrdreFabrication {
  id?: string;
  numero: string;                // ex : OF-20260518-001 (généré côté backend)
  produitNom: string;            // dénormalisé pour affichage
  formulationId: string;
  formulationCode?: string;
  formulationVersion: number;
  quantiteCible: number;
  uniteCible: Unite;
  dateLancementPrevue: string;   // ISO yyyy-MM-dd
  dateLancementEffective?: string;
  dateFin?: string;
  operateurResponsableId: string;
  operateurResponsableNom?: string;
  statut: StatutOf;
  historiqueStatuts: ChangementStatut[];
  consommationMp: ConsommationMp[];
  lotGenereId?: string;
  lotGenereNumero?: string;
  commentaire?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltreOf {
  q?: string;
  statut?: StatutOf;
  operateurId?: string;
  formulationId?: string;
  dateDebut?: string;
  dateFin?: string;
}
