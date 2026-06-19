/**
 * Constantes du module Stock v2 / 7.6 Valorisation financière.
 *
 * Toutes les valeurs paramétrables de la valorisation (méthodes de calcul du coût
 * unitaire, seuils de dérive budgétaire, seuil de marge, intervalle de
 * rafraîchissement temps réel) sont centralisées ici. AUCUNE valeur en dur dans
 * les composants ni dans les services de calcul.
 */

import { MethodeValorisation } from '../models/stock-v2-valorisation.model';

// ─── Méthodes de valorisation ───────────────────────────────────────────────

export const LIBELLES_METHODE_VALORISATION: Record<MethodeValorisation, string> = {
  CUMP: 'Coût unitaire moyen pondéré',
  DERNIER_PRIX: 'Dernier prix d’achat',
  FIXE: 'Coût fixe (manuel)',
};

export const DESCRIPTIONS_METHODE_VALORISATION: Record<MethodeValorisation, string> = {
  CUMP: 'Le coût est recalculé à chaque entrée : moyenne pondérée du stock existant et de la quantité reçue.',
  DERNIER_PRIX: 'Le coût prend la valeur du dernier prix d’achat enregistré à l’entrée.',
  FIXE: 'Le coût est saisi manuellement et ne varie pas automatiquement (comportement historique).',
};

export const COULEURS_METHODE_VALORISATION: Record<MethodeValorisation, { bg: string; text: string }> = {
  CUMP:         { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  DERNIER_PRIX: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  FIXE:         { bg: 'bg-slate-200',  text: 'text-slate-700' },
};

export const ORDRE_METHODES: MethodeValorisation[] = ['CUMP', 'DERNIER_PRIX', 'FIXE'];

// ─── Codes couleur des marges / écarts financiers ───────────────────────────

/** Colorimétrie d'une valeur financière (positive = vert, négative = rouge, sous-seuil = orange). */
export const COULEURS_MARGE = {
  positive:  { bg: 'bg-green-50',  text: 'text-green-700',  cell: 'bg-green-100' },
  sousSeuil: { bg: 'bg-amber-50',  text: 'text-amber-700',  cell: 'bg-amber-100' },
  negative:  { bg: 'bg-red-50',    text: 'text-red-700',    cell: 'bg-red-100' },
  neutre:    { bg: 'bg-slate-50',  text: 'text-slate-600',  cell: 'bg-white' },
};

// ─── Paramètres de valorisation ─────────────────────────────────────────────

export const PARAMETRES_VALORISATION = {
  /** Méthode appliquée par défaut tant qu'aucun paramétrage global n'est défini. */
  methodeDefaut: 'FIXE' as MethodeValorisation,
  /** Au-delà de cet écart (%) vs période de référence, une dérive budgétaire est signalée. */
  seuilDeriveBudgetPct: 20,
  /** En-dessous de ce taux de marge (%), un produit est considéré comme peu rentable. */
  seuilMargeMinPct: 15,
  /** Intervalle (ms) de rafraîchissement automatique de la valeur de stock temps réel. */
  intervalRefreshMs: 30000,
  /** Nombre de mois affichés dans les courbes d'évolution. */
  nbMoisEvolution: 12,
  /** Pagination par défaut des tables financières. */
  pageSize: 20,
  /** Au-delà de cet écart (%) entre deux coûts successifs, on signale un écart anormal. */
  ecartCoutAnormalPct: 50,
  /** Nombre d'éléments des classements (top sites / produits). */
  topElements: 10,
};
