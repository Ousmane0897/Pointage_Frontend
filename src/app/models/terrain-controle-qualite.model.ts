/**
 * Modèles pour le Contrôle Qualité Terrain — Module Exploitation Terrain (5.2).
 *
 * Grilles d'évaluation paramétrables par site (critères : propreté,
 * conformité au cahier des charges, finitions, etc.). Notation par critère
 * (échelle 1 à 5 par défaut) + note globale calculée.
 */

export interface CritereEvaluation {
  libelle: string;
  parametre: string;          // clé technique, ex: "proprete_sols"
  poids: number;              // pondération 0..1 ou nombre entier
  noteMin: number;            // ex: 1
  noteMax: number;            // ex: 5
  obligatoire: boolean;
  description?: string;
}

export interface GrilleEvaluationTerrain {
  id?: string;
  nom: string;                // ex: "Bureau standard"
  siteId?: string;            // grille spécifique à un site, sinon générique
  siteNom?: string;
  criteres: CritereEvaluation[];
  noteSeuilConformite?: number;        // ex: 3.5 — en dessous = non conforme
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotationCritere {
  parametre: string;
  libelle: string;
  poids: number;
  note: number;
  commentaire?: string;
}

export type DecisionControleTerrain =
  | 'CONFORME'
  | 'NON_CONFORME'
  | 'RESERVES';

export interface PhotoControleTerrain {
  nomFichier: string;
  url?: string;
  mimeType?: string;
  legende?: string;
}

export interface ControleQualiteTerrain {
  id?: string;
  siteId: string;
  siteCode?: string;
  siteNom?: string;
  grilleId?: string;
  grilleNom?: string;

  dateControle: string;
  controleurEmployeId?: string;
  controleurNom?: string;

  notations: NotationCritere[];
  noteGlobale: number;        // pondérée
  decision: DecisionControleTerrain;
  commentaire?: string;       // obligatoire si NON_CONFORME / RESERVES
  photos: PhotoControleTerrain[];
  createdAt?: string;
}

export interface FiltreControleTerrain {
  dateDebut?: string;
  dateFin?: string;
  siteId?: string;
  decision?: DecisionControleTerrain;
  controleurEmployeId?: string;
}

export interface EvolutionNotePoint {
  dateControle: string;
  noteGlobale: number;
  decision: DecisionControleTerrain;
}
