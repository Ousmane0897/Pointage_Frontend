/**
 * Calcul des valeurs dérivées d'une fiche de formulation — miroir client de
 * FormulationCalculService (backend). Permet le recalcul temps réel dans le
 * formulaire, sans sauvegarde ni appel serveur.
 *
 * ⚠️ Valeurs CALCULÉES, jamais persistées. L'arrondi est réservé à l'affichage
 * (kg → 1 décimale, % → 2 décimales) ; ces fonctions renvoient des nombres bruts.
 *
 * Fonction A : matière active — Σ(dosage × MA_MP/100) des lignes comptées.
 * Fonction B : eau de complément « qsp » — quantiteRef − Σ(autres lignes).
 * Fonction C : contrôle du total — écart |total − lot| vs tolérance.
 */
import { SyntheseFormulation } from '../models/production-formulation.model';

/** Tolérance de contrôle du total par défaut (± 0,1 %) si le paramétrage n'est pas chargé. */
export const TOLERANCE_TOTAL_DEFAUT_PCT = 0.1;

/** Sous-ensemble des champs MP nécessaires au calcul (concentration + drapeau « compter »). */
export interface MatiereActiveInfo {
  matiereActivePct?: number | null;
  compterDansMa?: boolean;
  nom?: string;
}

/** Sous-ensemble des champs de ligne nécessaires au calcul. */
export interface LigneCalcul {
  matierePremiereId?: string | null;
  dosage?: number | null;
  ingredientComplement?: boolean;
  qs?: boolean;
}

/**
 * Calcule la synthèse dérivée d'une formule.
 *
 * @param ingredients   lignes d'ingrédients courantes (valeurs du formulaire)
 * @param quantiteRef   taille du lot de référence (peut être null / 0)
 * @param matieresById  MP référencées, indexées par id
 * @param tolerancePct  tolérance de contrôle du total (%), défaut 0,1 %
 */
export function calculerSynthese(
  ingredients: readonly LigneCalcul[] | null | undefined,
  quantiteRef: number | null | undefined,
  matieresById: ReadonlyMap<string, MatiereActiveInfo>,
  tolerancePct: number = TOLERANCE_TOTAL_DEFAUT_PCT,
): SyntheseFormulation {
  const lignes = ingredients ?? [];
  const warnings: string[] = [];

  const lotValide = quantiteRef != null && quantiteRef > 0;
  const lot = lotValide ? (quantiteRef as number) : null;
  if (!lotValide) {
    warnings.push('Taille du lot absente ou nulle : les pourcentages ne peuvent pas être calculés.');
  }

  const dosageOuZero = (l: LigneCalcul): number =>
    l.dosage == null || isNaN(l.dosage) ? 0 : l.dosage;

  // ─── Fonction A : matière active ──────────────────────────────────────────
  let maTotaleKg = 0;
  for (const l of lignes) {
    if (l.qs || l.ingredientComplement) continue;
    const mp = l.matierePremiereId ? matieresById.get(l.matierePremiereId) : undefined;
    if (!mp || !mp.compterDansMa) continue;
    if (mp.matiereActivePct == null) {
      warnings.push(
        `La matière première « ${mp.nom ?? l.matierePremiereId} » est comptée dans la MA ` +
          `mais n'a pas de concentration renseignée (comptée pour 0).`,
      );
      continue;
    }
    maTotaleKg += dosageOuZero(l) * mp.matiereActivePct / 100;
  }

  const maPct = lotValide ? (maTotaleKg * 100) / (lot as number) : null;

  // ─── Fonction B : eau de complément (qsp) ─────────────────────────────────
  const lignesComplement = lignes.filter((l) => l.ingredientComplement);
  const nbLignesComplement = lignesComplement.length;
  if (nbLignesComplement > 1) {
    warnings.push('Plusieurs lignes de complément (qsp) : une seule est autorisée par formule.');
  }

  let eauQspKg: number | null = null;
  if (nbLignesComplement === 1 && lotValide) {
    const complement = lignesComplement[0];
    let sommeAutres = 0;
    for (const l of lignes) {
      if (l === complement || l.qs) continue;
      sommeAutres += dosageOuZero(l);
    }
    const eau = (lot as number) - sommeAutres;
    if (eau < 0) {
      warnings.push(
        "Les autres ingrédients dépassent la taille du lot : l'eau de complément serait négative.",
      );
    } else {
      eauQspKg = eau;
    }
  }

  // ─── Fonction C : contrôle du total ───────────────────────────────────────
  let totalSaisiKg = 0;
  const complement = nbLignesComplement === 1 ? lignesComplement[0] : null;
  for (const l of lignes) {
    if (l.qs) continue;
    if (l === complement && eauQspKg != null) {
      totalSaisiKg += eauQspKg;
    } else {
      totalSaisiKg += dosageOuZero(l);
    }
  }

  let ecartTolerancePct: number | null = null;
  let totalConforme = false;
  if (lotValide) {
    ecartTolerancePct = (Math.abs(totalSaisiKg - (lot as number)) * 100) / (lot as number);
    totalConforme = ecartTolerancePct <= tolerancePct;
  }

  return {
    maTotaleKg,
    maPct,
    eauQspKg,
    totalSaisiKg,
    ecartTolerancePct,
    totalConforme,
    nbLignesComplement,
    warnings,
  };
}
