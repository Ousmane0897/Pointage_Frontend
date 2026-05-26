/**
 * Modèles pour le Contrôle Qualité Production — Module Production Chimie (5.1).
 *
 * Une grille de contrôle est paramétrée par produit (liste de tests à effectuer
 * avec valeurs cibles et tolérances). Pour chaque lot fraîchement produit, un
 * contrôle qualité est créé AVANT mise en stock.
 *
 * Décision : VALIDE → le lot passe en stock chimie produits finis.
 *           REJET  → commentaire obligatoire, lot bloqué.
 */

export type DecisionControle = 'VALIDE' | 'REJET';

export interface TestQualite {
  libelle: string;               // ex : "pH"
  parametre: string;             // clé technique : "ph", "viscosite", etc.
  valeurCible: number | string;  // string pour tests qualitatifs (ex : "limpide")
  toleranceMin?: number;
  toleranceMax?: number;
  unite?: string;                // ex : "pH", "cP", "g/cm³", ""
  obligatoire: boolean;
  type: 'NUMERIQUE' | 'TEXTUEL' | 'BINAIRE';
}

export interface GrilleControle {
  id?: string;
  produitNom: string;            // identifie la grille
  formulationId?: string;        // optionnel : grille spécifique à une formulation
  tests: TestQualite[];
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MesureTest {
  testLibelle: string;
  parametre: string;
  valeurCible: number | string;
  valeurMesuree: number | string;
  unite?: string;
  conforme: boolean;
  commentaire?: string;
}

export interface PhotoControle {
  url: string;
  nomFichier: string;
  mimeType?: string;
}

export interface ControleQualite {
  id?: string;
  lotId: string;
  lotNumero?: string;
  produitNom?: string;
  grilleId?: string;
  dateControle: string;          // ISO
  controleurId?: string;
  controleurNom?: string;
  mesures: MesureTest[];
  decision: DecisionControle;
  commentaire?: string;          // obligatoire si REJET
  photos: PhotoControle[];
  createdAt?: string;
}

export interface FiltreControle {
  lotId?: string;
  produitNom?: string;
  decision?: DecisionControle;
  dateDebut?: string;
  dateFin?: string;
}

export interface TendanceParametre {
  parametre: string;
  libelle: string;
  unite?: string;
  valeursCible: { lotNumero: string; date: string; valeur: number }[];
  cible?: number;
  toleranceMin?: number;
  toleranceMax?: number;
}
