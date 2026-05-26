/**
 * Modèles pour les Formats de Conditionnement — Module Production Chimie (5.1).
 *
 * Référentiel des formats (330mL, 500mL, 1L, 1.5L, 5L, 20L, etc.) utilisés
 * pour l'étiquetage des lots et la traçabilité du conditionnement.
 */

import { Unite } from './production-matiere-premiere.model';

export type TypeContenant =
  | 'BOUTEILLE'
  | 'BIDON'
  | 'FUT'
  | 'SACHET'
  | 'POT'
  | 'AUTRE';

export interface Dimensions {
  longueurMm: number;
  largeurMm: number;
  hauteurMm: number;
}

export interface FormatConditionnement {
  id?: string;
  code: string;                  // unique, ex : "F-1L"
  libelle: string;               // ex : "Bouteille 1 Litre"
  volume: number;                // en uniteVolume
  uniteVolume: Unite;            // L, ML
  typeContenant: TypeContenant;
  dimensions?: Dimensions;
  poidsVide?: number;            // en grammes
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltreFormatConditionnement {
  q?: string;
  typeContenant?: TypeContenant;
  actif?: boolean;
}
