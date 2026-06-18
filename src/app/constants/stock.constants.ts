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
import { StatutBon, ActionWorkflow } from '../models/stock-v2-workflow.model';
import { TypeEntree } from '../models/stock-v2-bon-entree.model';
import { TypeSortie, TypeDestinataire } from '../models/stock-v2-bon-sortie.model';
import { GranularitePlafond } from '../models/stock-v2-plafond.model';
import { SensEcartDotation } from '../models/stock-v2-dotation.model';

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

// ════════════════════════════════════════════════════════════════════════════
// 7.4 Contrôle des mouvements (entrées & sorties)
// ════════════════════════════════════════════════════════════════════════════

// ─── Catégorisation des entrées (enums figés) ───────────────────────────────

export const LIBELLES_TYPE_ENTREE: Record<TypeEntree, string> = {
  ACHAT_FOURNISSEUR: 'Achat fournisseur',
  RETOUR_PRODUCTION: 'Retour de production',
  TRANSFERT_INTER_SITES: 'Transfert inter-sites',
  REINTEGRATION: 'Réintégration',
};

export const DESCRIPTIONS_TYPE_ENTREE: Record<TypeEntree, string> = {
  ACHAT_FOURNISSEUR: 'Réception de marchandises commandées auprès d’un fournisseur externe.',
  RETOUR_PRODUCTION: 'Retour en stock de produits issus de la production interne.',
  TRANSFERT_INTER_SITES: 'Entrée résultant d’un transfert depuis un autre site.',
  REINTEGRATION: 'Réintégration en stock (retour terrain, annulation de sortie, surplus).',
};

export const COULEURS_TYPE_ENTREE: Record<TypeEntree, { bg: string; text: string }> = {
  ACHAT_FOURNISSEUR:     { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  RETOUR_PRODUCTION:     { bg: 'bg-teal-100',    text: 'text-teal-700' },
  TRANSFERT_INTER_SITES: { bg: 'bg-blue-100',    text: 'text-blue-700' },
  REINTEGRATION:         { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
};

export const ORDRE_TYPES_ENTREE: TypeEntree[] = [
  'ACHAT_FOURNISSEUR', 'RETOUR_PRODUCTION', 'TRANSFERT_INTER_SITES', 'REINTEGRATION',
];

// ─── Catégorisation des sorties (enums figés) ───────────────────────────────

export const LIBELLES_TYPE_SORTIE: Record<TypeSortie, string> = {
  DISTRIBUTION_AGENCE_SITE_CLIENT: 'Distribution agence / site client',
  DISTRIBUTION_CHANTIER: 'Distribution chantier',
  VENTE_PRODUIT: 'Vente de produit',
  CONSOMMATION_INTERNE: 'Consommation interne',
};

export const DESCRIPTIONS_TYPE_SORTIE: Record<TypeSortie, string> = {
  DISTRIBUTION_AGENCE_SITE_CLIENT: 'Dotation envoyée vers une agence ou un site client.',
  DISTRIBUTION_CHANTIER: 'Approvisionnement d’un chantier ou d’une intervention terrain.',
  VENTE_PRODUIT: 'Sortie liée à une vente (rattachement au module Vente — à venir).',
  CONSOMMATION_INTERNE: 'Consommation interne (siège, production, services généraux).',
};

export const COULEURS_TYPE_SORTIE: Record<TypeSortie, { bg: string; text: string }> = {
  DISTRIBUTION_AGENCE_SITE_CLIENT: { bg: 'bg-sky-100',    text: 'text-sky-700' },
  DISTRIBUTION_CHANTIER:           { bg: 'bg-amber-100',  text: 'text-amber-700' },
  VENTE_PRODUIT:                   { bg: 'bg-rose-100',   text: 'text-rose-700' },
  CONSOMMATION_INTERNE:            { bg: 'bg-slate-200',  text: 'text-slate-700' },
};

export const ORDRE_TYPES_SORTIE: TypeSortie[] = [
  'DISTRIBUTION_AGENCE_SITE_CLIENT', 'DISTRIBUTION_CHANTIER', 'VENTE_PRODUIT', 'CONSOMMATION_INTERNE',
];

// ─── Destinataire d'un bon de sortie ────────────────────────────────────────

export const LIBELLES_TYPE_DESTINATAIRE: Record<TypeDestinataire, string> = {
  SITE: 'Site / agence',
  AGENT: 'Agent',
  CLIENT: 'Client externe',
};

export const ORDRE_TYPES_DESTINATAIRE: TypeDestinataire[] = ['SITE', 'AGENT', 'CLIENT'];

// ─── Statuts de bon (workflow) ──────────────────────────────────────────────

export const LIBELLES_STATUT_BON: Record<StatutBon, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  EFFECTIF: 'Effectif',
  REFUSE: 'Refusé',
};

export const COULEURS_STATUT_BON: Record<StatutBon, { bg: string; text: string; dot: string }> = {
  BROUILLON: { bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-400' },
  SOUMIS:    { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  VALIDE:    { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  EFFECTIF:  { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500' },
  REFUSE:    { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
};

/** Ordre d'affichage des colonnes du Kanban de workflow. */
export const ORDRE_STATUTS_BON: StatutBon[] = [
  'BROUILLON', 'SOUMIS', 'VALIDE', 'EFFECTIF', 'REFUSE',
];

export const LIBELLES_ACTION_WORKFLOW: Record<ActionWorkflow, string> = {
  CREATION: 'Création',
  MODIFICATION: 'Modification',
  SOUMISSION: 'Soumission',
  VALIDATION: 'Validation',
  REFUS: 'Refus',
  EFFECTIF: 'Mouvement effectif',
};

export const COULEURS_ACTION_WORKFLOW: Record<ActionWorkflow, string> = {
  CREATION: 'bg-slate-400',
  MODIFICATION: 'bg-slate-500',
  SOUMISSION: 'bg-amber-500',
  VALIDATION: 'bg-blue-500',
  REFUS: 'bg-red-500',
  EFFECTIF: 'bg-green-500',
};

// ─── Plafonds & dotation ────────────────────────────────────────────────────

export const LIBELLES_GRANULARITE_PLAFOND: Record<GranularitePlafond, string> = {
  PRODUIT: 'Produit',
  CATEGORIE: 'Catégorie',
};

export const LIBELLES_SENS_ECART_DOTATION: Record<SensEcartDotation, string> = {
  SUR_CONSOMMATION: 'Sur-consommation',
  SOUS_CONSOMMATION: 'Sous-consommation',
  CONFORME: 'Conforme',
};

export const COULEURS_SENS_ECART_DOTATION: Record<SensEcartDotation, { bg: string; text: string }> = {
  SUR_CONSOMMATION:  { bg: 'bg-red-100',    text: 'text-red-700' },
  SOUS_CONSOMMATION: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  CONFORME:          { bg: 'bg-green-100',  text: 'text-green-700' },
};

// ─── Topics WebSocket (validations stock) ───────────────────────────────────

/** Broadcast : un bon est soumis / une décision est rendue. */
export const TOPIC_STOCK_VALIDATIONS = '/topic/stock-validations';
/** Notification ciblée vers le validateur (Responsable Achats) ou superviseur. */
export const QUEUE_NOTIFICATIONS_STOCK = '/user/queue/notifications-stock';

// ─── Paramètres du contrôle des mouvements ──────────────────────────────────

export const PARAMETRES_CONTROLE_MOUVEMENTS = {
  /** Préfixe des numéros de bon d'entrée (BE-AAAAMMJJ-XXX). */
  prefixeBonEntree: 'BE',
  /** Préfixe des numéros de bon de sortie (BS-AAAAMMJJ-XXX). */
  prefixeBonSortie: 'BS',
  /** Seuil (%) de consommation déclenchant une alerte « attention » sur une jauge. */
  seuilAlertePlafondPct: 90,
  /** Au-delà de ce seuil (%) la jauge passe en dépassement. */
  seuilDepassementPlafondPct: 100,
  /** Nombre de mois affichés par défaut dans les courbes d'évolution. */
  nbMoisEvolutionDefaut: 12,
};

