/**
 * Modèle de données pour les Évaluations Périodiques – Développement RH
 *
 * Workflow : BROUILLON → AUTO_EVALUATION → EVALUATION_MANAGER → VALIDE
 */

// ─── Types ────────────────────────────────────────────────────────

export type TypeNotation = 'NUMERIQUE' | 'ALPHABETIQUE';

export type NotationAlphabetique = 'A' | 'B' | 'C' | 'D';

export type CategoriesCritere = 'TECHNIQUE' | 'COMPORTEMENTAL' | 'OBJECTIFS';

export type StatutEvaluation =
  | 'BROUILLON'
  | 'AUTO_EVALUATION'
  | 'EVALUATION_MANAGER'
  | 'VALIDE';

// ─── Interfaces ───────────────────────────────────────────────────

export interface CritereEvaluation {
  code: string;
  libelle: string;
  description?: string;
  poids: number;                 // poids en %, somme des critères = 100
  categorie: CategoriesCritere;
}

export interface GrilleEvaluation {
  id?: string;

  // Descriptif
  titre: string;
  description?: string;

  // Périmètre d'application
  postesConcernes: string[];
  departementsConcernes: string[];

  // Critères
  criteres: CritereEvaluation[];

  // État
  actif: boolean;
  dateCreation?: string;
}

export interface NoteEvaluation {
  critereCode: string;
  critereLibelle?: string;
  note: number;                  // 1 à 5
  commentaire?: string;
}

export interface EvaluationPeriodique {
  id?: string;

  // Référence employé
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;
  poste?: string;

  // Référence grille
  grilleId: string;
  grilleTitre?: string;

  // Période évaluée
  periode: string;               // ex : '2025', '2025-S1'
  typeNotation: TypeNotation;

  // Notes
  notesAutoEvaluation: NoteEvaluation[];
  notesManager: NoteEvaluation[];

  // Commentaires
  commentaireEmploye?: string;
  commentaireManager?: string;
  objectifsPeriodeSuivante?: string;

  // Résultat global (calculé)
  noteGlobale?: number;          // moyenne pondérée
  noteAlphabetique?: NotationAlphabetique;

  // Workflow
  statut: StatutEvaluation;
  dateCreation?: string;
  dateAutoEvaluation?: string;
  dateEvaluationManager?: string;
  dateValidation?: string;
  evaluateurId?: string;
  evaluateurNom?: string;

  // Lien Plan de Formation
  besoinsFormationIdentifies?: string[];
}

// ─── Filtres ──────────────────────────────────────────────────────

export interface FiltreEvaluation {
  employeId?: string;
  departement?: string;
  periode?: string;
  statut?: StatutEvaluation;
  q?: string;
}

// ─── Labels fr-FR ─────────────────────────────────────────────────

export const LIBELLES_STATUT_EVALUATION: Record<StatutEvaluation, string> = {
  BROUILLON: 'Brouillon',
  AUTO_EVALUATION: 'Auto-évaluation',
  EVALUATION_MANAGER: 'Évaluation manager',
  VALIDE: 'Validé',
};

export const LIBELLES_NOTATION_ALPHABETIQUE: Record<NotationAlphabetique, string> = {
  A: 'Excellent',
  B: 'Bon',
  C: 'Satisfaisant',
  D: 'Insuffisant',
};

export const LIBELLES_CATEGORIE_CRITERE: Record<CategoriesCritere, string> = {
  TECHNIQUE: 'Technique',
  COMPORTEMENTAL: 'Comportemental',
  OBJECTIFS: 'Objectifs',
};
