/**
 * Constantes du module Stock v2 / 7.3 Stocks & Approvisionnement.
 *
 * Toutes les valeurs partagées par plusieurs composants (libellés de statut,
 * couleurs de badges, unités, seuils par défaut, palette charts) sont
 * regroupées ici. AUCUNE valeur ne doit être codée en dur dans les composants.
 */

import { TypeProduit, UniteStock } from '../models/stock-v2-produit.model';
import { TypeMouvement, MotifMouvement } from '../models/stock-v2-mouvement.model';
import { StatutStock } from '../models/stock-v2-etat-stock.model';
import { StatutInventaire } from '../models/stock-v2-inventaire.model';

// ─── Types de produit ───────────────────────────────────────────────────────

export const LIBELLES_TYPE_PRODUIT: Record<TypeProduit, string> = {
  PRODUIT_FINI: 'Produit fini',
  MATIERE_PREMIERE: 'Matière première',
  CONSOMMABLE: 'Consommable',
  EPI: 'EPI',
  MATERIEL: 'Matériel',
};

export const COULEURS_TYPE_PRODUIT: Record<TypeProduit, { bg: string; text: string }> = {
  PRODUIT_FINI:     { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  MATIERE_PREMIERE: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  CONSOMMABLE:      { bg: 'bg-teal-100',   text: 'text-teal-700' },
  EPI:              { bg: 'bg-amber-100',  text: 'text-amber-700' },
  MATERIEL:        { bg: 'bg-slate-200',  text: 'text-slate-700' },
};

export const ORDRE_TYPES_PRODUIT: TypeProduit[] = [
  'PRODUIT_FINI', 'MATIERE_PREMIERE', 'CONSOMMABLE', 'EPI', 'MATERIEL',
];

// ─── Unités de mesure ───────────────────────────────────────────────────────

export const LIBELLES_UNITE: Record<UniteStock, string> = {
  KG: 'kg',
  G: 'g',
  L: 'L',
  ML: 'mL',
  PIECE: 'pce',
  M2: 'm²',
  M3: 'm³',
  METRE: 'm',
  CARTON: 'carton',
  LOT: 'lot',
};

export const ORDRE_UNITES: UniteStock[] = [
  'KG', 'G', 'L', 'ML', 'PIECE', 'M2', 'M3', 'METRE', 'CARTON', 'LOT',
];

// ─── Types de mouvement ─────────────────────────────────────────────────────

export const LIBELLES_TYPE_MOUVEMENT: Record<TypeMouvement, string> = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  TRANSFERT: 'Transfert',
};

export const COULEURS_TYPE_MOUVEMENT: Record<TypeMouvement, { bg: string; text: string }> = {
  ENTREE:    { bg: 'bg-green-100',  text: 'text-green-700' },
  SORTIE:    { bg: 'bg-red-100',    text: 'text-red-700' },
  TRANSFERT: { bg: 'bg-blue-100',   text: 'text-blue-700' },
};

// ─── Motifs de mouvement ────────────────────────────────────────────────────

export const LIBELLES_MOTIF_MOUVEMENT: Record<MotifMouvement, string> = {
  ACHAT: 'Achat',
  PRODUCTION: 'Production',
  CONSOMMATION: 'Consommation',
  VENTE: 'Vente',
  TRANSFERT: 'Transfert inter-sites',
  AJUSTEMENT: 'Ajustement',
  RETOUR: 'Retour',
  PERTE: 'Perte / casse',
};

/** Motifs proposés selon le type de mouvement sélectionné. */
export const MOTIFS_PAR_TYPE: Record<TypeMouvement, MotifMouvement[]> = {
  ENTREE: ['ACHAT', 'PRODUCTION', 'RETOUR', 'AJUSTEMENT'],
  SORTIE: ['CONSOMMATION', 'VENTE', 'PERTE', 'AJUSTEMENT'],
  TRANSFERT: ['TRANSFERT'],
};

// ─── Statuts d'état de stock ────────────────────────────────────────────────

export const LIBELLES_STATUT_STOCK: Record<StatutStock, string> = {
  RUPTURE: 'Rupture',
  CRITIQUE: 'Seuil critique',
  OK: 'Disponible',
};

export const COULEURS_STATUT_STOCK: Record<StatutStock, { bg: string; text: string; dot: string }> = {
  RUPTURE:  { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  CRITIQUE: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  OK:       { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
};

// ─── Statuts d'inventaire (workflow) ────────────────────────────────────────

export const LIBELLES_STATUT_INVENTAIRE: Record<StatutInventaire, string> = {
  BROUILLON: 'Brouillon',
  COMPTAGE: 'Comptage',
  VALIDATION: 'Validation',
  CLOTURE: 'Clôturé',
};

export const COULEURS_STATUT_INVENTAIRE: Record<StatutInventaire, { bg: string; text: string }> = {
  BROUILLON:  { bg: 'bg-slate-100',  text: 'text-slate-700' },
  COMPTAGE:   { bg: 'bg-blue-100',   text: 'text-blue-700' },
  VALIDATION: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  CLOTURE:    { bg: 'bg-green-100',  text: 'text-green-700' },
};

export const ORDRE_STATUTS_INVENTAIRE: StatutInventaire[] = [
  'BROUILLON', 'COMPTAGE', 'VALIDATION', 'CLOTURE',
];

// ─── Palette graphiques (alignée sur RH / Production Chimie) ─────────────────

export const COULEURS_CHARTS: ReadonlyArray<string> = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

// ─── Paramètres généraux ────────────────────────────────────────────────────

export const PARAMETRES_STOCK = {
  /** Pagination par défaut (lignes par page). */
  pageSize: 20,
  /** Taille max d'une photo produit (Mo). */
  tailleMaxPhotoMo: 5,
  /** Taille max de la fiche technique (Mo). */
  tailleMaxFicheMo: 10,
  /** Types d'images acceptés pour la photo produit. */
  typesImageAcceptes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** Types acceptés pour la fiche technique. */
  typesFicheAcceptes: ['application/pdf'] as const,
  /** Seuil d'écart par défaut au-delà duquel une justification d'inventaire est exigée. */
  seuilEcartJustificationDefaut: 5,
  /** Horizon par défaut (mois) pour le calcul de consommation moyenne (appro auto). */
  nMoisApproDefaut: 3,
  /** Seuil de dormance par défaut (mois sans mouvement) pour le tableau de bord. */
  moisDormanceDefaut: 6,
  /** Nombre d'éléments du top consommations. */
  topConsommations: 10,
};

/** Devise et formatage des montants (FCFA, sans décimales). */
export const DEVISE = 'FCFA';
