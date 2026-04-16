/**
 * Constantes du module Paie — Réglementation sénégalaise.
 *
 * Toutes les valeurs (taux, plafonds, tranches) sont regroupées ici pour
 * faciliter les mises à jour réglementaires. AUCUN taux ne doit être codé
 * en dur ailleurs dans le module Paie.
 *
 * Sources : IPRES, CSS, Code Général des Impôts du Sénégal.
 */

import { TypeMajoration } from '../models/heure-supplementaire.model';

// ─── IPRES — Institution de Prévoyance Retraite du Sénégal ──────────────────

export interface TauxCotisation {
  salarie: number;     // taux part salariale (décimal : 0.056 = 5,6 %)
  employeur: number;   // taux part patronale
  plafondMensuel?: number; // plafond mensuel de l'assiette en FCFA
}

export const TAUX_IPRES: {
  regimeGeneral: TauxCotisation;
  regimeComplementaire: TauxCotisation;
} = {
  regimeGeneral: {
    salarie: 0.056,
    employeur: 0.084,
    plafondMensuel: 432_000,
  },
  regimeComplementaire: {
    salarie: 0.024,
    employeur: 0.036,
    plafondMensuel: 1_296_000,
  },
};

// ─── CSS — Caisse de Sécurité Sociale ───────────────────────────────────────

export const TAUX_CSS: {
  accidentTravail: TauxCotisation;      // AT/MP
  prestationsFamiliales: TauxCotisation; // PF (100 % patronal)
} = {
  accidentTravail: {
    salarie: 0.01,
    employeur: 0.03,
  },
  prestationsFamiliales: {
    salarie: 0,
    employeur: 0.07,
  },
};

// ─── IR — Impôt sur le Revenu (barème progressif annuel) ────────────────────

export interface TrancheIR {
  min: number;     // borne inférieure de la tranche (FCFA annuels)
  max: number;     // borne supérieure (Infinity pour la dernière tranche)
  taux: number;    // taux marginal (décimal)
}

export const BAREME_IR: TrancheIR[] = [
  { min: 0,          max: 630_000,    taux: 0.00 },
  { min: 630_000,    max: 1_500_000,  taux: 0.20 },
  { min: 1_500_000,  max: 4_000_000,  taux: 0.30 },
  { min: 4_000_000,  max: 8_000_000,  taux: 0.35 },
  { min: 8_000_000,  max: 13_500_000, taux: 0.37 },
  { min: 13_500_000, max: Infinity,   taux: 0.40 },
];

// ─── TRIMF — Taxe Représentative de l'Impôt Minimum Forfaitaire ─────────────
// Prélèvement mensuel forfaitaire selon tranche de salaire brut annuel.

export interface TrancheTRIMF {
  minAnnuel: number;
  maxAnnuel: number;
  montantMensuel: number; // FCFA
}

export const BAREME_TRIMF: TrancheTRIMF[] = [
  { minAnnuel: 0,         maxAnnuel: 600_000,    montantMensuel: 75 },
  { minAnnuel: 600_000,   maxAnnuel: 1_000_000,  montantMensuel: 300 },
  { minAnnuel: 1_000_000, maxAnnuel: 2_000_000,  montantMensuel: 350 },
  { minAnnuel: 2_000_000, maxAnnuel: 7_000_000,  montantMensuel: 750 },
  { minAnnuel: 7_000_000, maxAnnuel: 15_000_000, montantMensuel: 1_500 },
  { minAnnuel: 15_000_000, maxAnnuel: Infinity,  montantMensuel: 3_000 },
];

// ─── Catégories professionnelles par défaut (seed) ──────────────────────────

export const CATEGORIES_PRO_DEFAUT: ReadonlyArray<{
  code: string;
  libelle: string;
  salaireBaseIndicatif: number;
}> = [
  { code: 'CADRE',      libelle: 'Cadre',              salaireBaseIndicatif: 500_000 },
  { code: 'MAITRISE',   libelle: 'Agent de maîtrise',  salaireBaseIndicatif: 300_000 },
  { code: 'EMPLOYE',    libelle: 'Employé',            salaireBaseIndicatif: 180_000 },
  { code: 'OUVRIER',    libelle: 'Ouvrier',            salaireBaseIndicatif: 150_000 },
  { code: 'STAGIAIRE',  libelle: 'Stagiaire',          salaireBaseIndicatif: 75_000  },
];

// ─── Mapping heures supplémentaires → coefficient multiplicateur ────────────
// Réconcilie les types de majoration du module 6.2 (T_15/T_40/T_60/T_100)
// avec le coefficient à appliquer sur le taux horaire pour calculer le
// montant en FCFA des heures supplémentaires dans le bulletin.

export const MAJORATION_HS_MAPPING: Record<TypeMajoration, number> = {
  T_15:  1.15,
  T_40:  1.40,
  T_60:  1.60,
  T_100: 2.00,
};

// ─── Paramètres généraux de la paie ─────────────────────────────────────────

export const PARAMETRES_PAIE = {
  /** Nombre d'heures légales mensuelles (40h/sem × 52/12 ≈ 173,33). */
  heuresLegalesMensuelles: 173.33,
  /** Plafond d'exonération de la prime de transport (FCFA/mois). */
  exonerationPrimeTransport: 26_000,
  /** Nombre de jours ouvrables standard par mois. */
  joursOuvrablesStandard: 26,
};
