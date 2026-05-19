/**
 * Constantes du module Exploitation v2 / Production Chimie (5.1).
 *
 * Toutes les valeurs partagées par plusieurs composants (libellés de statut,
 * couleurs de badges, formats, durées par défaut) sont regroupées ici.
 * AUCUNE valeur ne doit être codée en dur dans les composants.
 */

import { StatutOf } from '../models/production-ordre-fabrication.model';
import { StatutControleLot, StatutStockLot } from '../models/production-lot.model';
import { DecisionControle } from '../models/production-controle-qualite.model';
import { TypeMouvement } from '../models/production-mouvement-stock.model';
import { Unite } from '../models/production-matiere-premiere.model';
import { StatutFormulation } from '../models/production-formulation.model';
import { TypeContenant } from '../models/production-format-conditionnement.model';

// ─── Format du numéro de lot ────────────────────────────────────────────────
// Format attendu côté backend : AAAAMMJJ-XXX (XXX = compteur séquentiel
// quotidien, géré atomiquement via une collection compteurs_lots).

export const FORMAT_NUMERO_LOT = 'AAAAMMJJ-XXX';

// ─── Durée de péremption par défaut (jours) ─────────────────────────────────
// Valeur utilisée comme valeur initiale dans le formulaire de formulation ;
// reste paramétrable par fiche.

export const DUREE_PEREMPTION_DEFAUT_JOURS = 365;

// ─── Statuts des Ordres de Fabrication ──────────────────────────────────────

export const LIBELLES_STATUT_OF: Record<StatutOf, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
};

export const COULEURS_STATUT_OF: Record<StatutOf, { bg: string; text: string; border: string }> = {
  EN_ATTENTE: { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300' },
  EN_COURS:   { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300' },
  TERMINE:    { bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-300' },
  ANNULE:     { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300' },
};

export const ORDRE_STATUTS_OF: StatutOf[] = ['EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ANNULE'];

// ─── Statuts contrôle qualité des Lots ──────────────────────────────────────

export const LIBELLES_STATUT_CONTROLE_LOT: Record<StatutControleLot, string> = {
  EN_ATTENTE_CONTROLE: 'En attente de contrôle',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
};

export const COULEURS_STATUT_CONTROLE_LOT: Record<StatutControleLot, { bg: string; text: string }> = {
  EN_ATTENTE_CONTROLE: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  VALIDE:              { bg: 'bg-green-100',  text: 'text-green-700' },
  REJETE:              { bg: 'bg-red-100',    text: 'text-red-700' },
};

// ─── Statuts stock des Lots ─────────────────────────────────────────────────

export const LIBELLES_STATUT_STOCK_LOT: Record<StatutStockLot, string> = {
  EN_PRODUCTION: 'En production',
  EN_STOCK: 'En stock',
  BLOQUE: 'Bloqué',
  EXPEDIE: 'Expédié',
  PERIME: 'Périmé',
};

export const COULEURS_STATUT_STOCK_LOT: Record<StatutStockLot, { bg: string; text: string }> = {
  EN_PRODUCTION: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  EN_STOCK:      { bg: 'bg-green-100',  text: 'text-green-700' },
  BLOQUE:        { bg: 'bg-red-100',    text: 'text-red-700' },
  EXPEDIE:       { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  PERIME:        { bg: 'bg-slate-200',  text: 'text-slate-600' },
};

// ─── Décision Contrôle Qualité ──────────────────────────────────────────────

export const LIBELLES_DECISION_CONTROLE: Record<DecisionControle, string> = {
  VALIDE: 'Validé',
  REJET: 'Rejeté',
};

export const COULEURS_DECISION_CONTROLE: Record<DecisionControle, { bg: string; text: string }> = {
  VALIDE: { bg: 'bg-green-100', text: 'text-green-700' },
  REJET:  { bg: 'bg-red-100',   text: 'text-red-700' },
};

// ─── Statuts Formulation ────────────────────────────────────────────────────

export const LIBELLES_STATUT_FORMULATION: Record<StatutFormulation, string> = {
  BROUILLON: 'Brouillon',
  VALIDEE: 'Validée',
  ARCHIVEE: 'Archivée',
};

export const COULEURS_STATUT_FORMULATION: Record<StatutFormulation, { bg: string; text: string }> = {
  BROUILLON: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  VALIDEE:   { bg: 'bg-green-100',  text: 'text-green-700' },
  ARCHIVEE:  { bg: 'bg-slate-200',  text: 'text-slate-600' },
};

// ─── Type de Mouvement de Stock Chimie ──────────────────────────────────────

export const LIBELLES_TYPE_MOUVEMENT: Record<TypeMouvement, string> = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  AJUSTEMENT: 'Ajustement',
};

export const COULEURS_TYPE_MOUVEMENT: Record<TypeMouvement, { bg: string; text: string }> = {
  ENTREE:     { bg: 'bg-green-100', text: 'text-green-700' },
  SORTIE:     { bg: 'bg-blue-100',  text: 'text-blue-700' },
  AJUSTEMENT: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

// ─── Unités et formatage ────────────────────────────────────────────────────

export const LIBELLES_UNITE: Record<Unite, string> = {
  KG: 'kg',
  G: 'g',
  L: 'L',
  ML: 'mL',
  PIECE: 'pce',
};

export const UNITES_VOLUME: Unite[] = ['L', 'ML'];
export const UNITES_MASSE: Unite[] = ['KG', 'G'];

// ─── Types de contenants ────────────────────────────────────────────────────

export const LIBELLES_TYPE_CONTENANT: Record<TypeContenant, string> = {
  BOUTEILLE: 'Bouteille',
  BIDON: 'Bidon',
  FUT: 'Fût',
  SACHET: 'Sachet',
  POT: 'Pot',
  AUTRE: 'Autre',
};

// ─── Palette graphiques (alignée sur le tableau de bord RH) ─────────────────

export const COULEURS_CHARTS: ReadonlyArray<string> = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

// ─── Paramètres généraux ────────────────────────────────────────────────────

export const PARAMETRES_PRODUCTION = {
  /** Pagination par défaut (lignes par page). */
  pageSize: 20,
  /** Taille max d'une photo de contrôle qualité (Mo). */
  tailleMaxPhotoMo: 5,
  /** Taille max de la fiche de sécurité MP (Mo). */
  tailleMaxFicheSecuriteMo: 10,
  /** Types d'images acceptés pour les photos de contrôle. */
  typesImageAcceptes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** Types acceptés pour la fiche de sécurité. */
  typesFicheSecuriteAcceptes: ['application/pdf'] as const,
  /** Nombre par défaut d'étiquettes à imprimer en lot. */
  nbEtiquettesDefaut: 12,
  /** Nombre de points pour les mini-charts de tendance qualité. */
  nbPointsTendance: 10,
};
