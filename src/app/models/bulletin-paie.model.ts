/**
 * Modèle de données pour les Bulletins de Paie — Paie (6.3).
 *
 * Un BulletinPaie représente la paie d'un employé pour une période donnée.
 * Il est alimenté par :
 *  - les données employé (EmployeComplet, module 6.1)
 *  - le récapitulatif mensuel (6.2) pour heures travaillées / absences / HS
 *  - la catégorie professionnelle (grille salariale, 6.3) pour les valeurs par défaut
 */

export type StatutBulletin = 'BROUILLON' | 'VALIDE' | 'PAYE' | 'ANNULE';

export interface PeriodePaie {
  mois: number;    // 1-12
  annee: number;
}

/**
 * Une ligne du bulletin — gain, retenue ou cotisation.
 * L'affichage du bulletin regroupe les lignes par nature.
 */
export interface LigneBulletin {
  code: string;                // ex : "SAL_BASE", "PRIME_TRANS", "IPRES_SAL"
  libelle: string;             // ex : "Salaire de base"
  nature: 'GAIN' | 'RETENUE_SALARIALE' | 'COTISATION_PATRONALE' | 'INFORMATION';
  base?: number;               // assiette (optionnelle)
  taux?: number;               // taux appliqué en décimal (optionnel)
  montantSalarial?: number;    // FCFA (0 pour cotisations patronales pures)
  montantPatronal?: number;    // FCFA (pour cotisations patronales)
}

export interface BulletinPaie {
  id?: string;

  // ─── Référence employé (snapshot au moment du calcul) ─────────────────────
  employeId: string;
  matricule: string;
  nom: string;
  prenom: string;
  poste?: string;
  departement?: string;
  categorieCode?: string;
  numeroIpres?: string;
  numeroCss?: string;
  rib?: string;
  banque?: string;

  // ─── Période ──────────────────────────────────────────────────────────────
  periode: PeriodePaie;

  // ─── Temps travaillé (snapshot du récap mensuel 6.2) ──────────────────────
  joursTravailles: number;
  joursAbsence: number;
  joursConge: number;
  heuresSupTotal: number;
  heuresSupMajoreesEquivalent: number;

  // ─── Détail du calcul ─────────────────────────────────────────────────────
  lignes: LigneBulletin[];

  // ─── Totaux calculés ──────────────────────────────────────────────────────
  salaireBrut: number;
  totalCotisationsSalariales: number;
  totalCotisationsPatronales: number;
  impotRevenu: number;
  trimf: number;
  netAPayer: number;
  coutTotalEmployeur: number;   // brut + cotisations patronales

  // ─── Cumuls annuels (alimentés à la validation) ───────────────────────────
  cumulBrutAnnuel?: number;
  cumulNetAnnuel?: number;
  cumulIrAnnuel?: number;
  soldeConges?: number;

  // ─── Workflow ─────────────────────────────────────────────────────────────
  statut: StatutBulletin;
  dateCalcul?: string;          // yyyy-MM-dd
  dateValidation?: string;
  datePaiement?: string;
  validateurId?: string;
  validateurNom?: string;
  commentaire?: string;
}

export interface FiltreBulletin {
  employeId?: string;
  departement?: string;
  mois?: number;
  annee?: number;
  statut?: StatutBulletin;
  q?: string;
}

export const LIBELLES_STATUT_BULLETIN: Record<StatutBulletin, string> = {
  BROUILLON: 'Brouillon',
  VALIDE:    'Validé',
  PAYE:      'Payé',
  ANNULE:    'Annulé',
};
