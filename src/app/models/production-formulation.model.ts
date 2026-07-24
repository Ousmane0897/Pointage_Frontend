/**
 * Modèles pour les Fiches de Formulation — Module Exploitation v2 / Production Chimie (5.1).
 *
 * Une fiche de formulation est une recette produit chimique : liste ordonnée
 * d'ingrédients (matières premières + dosages) et de procédé (étapes avec
 * conditions). Les versions sont embarquées dans le document principal pour
 * permettre la consultation et la restauration d'historique en un seul GET.
 */

import { Unite } from './production-matiere-premiere.model';

export type StatutFormulation = 'BROUILLON' | 'VALIDEE' | 'ARCHIVEE';

export interface IngredientFormulation {
  matierePremiereId: string;
  matierePremiereNom?: string;   // dénormalisé pour affichage rapide
  dosage?: number;               // quantité pour le lot de référence ; optionnel si qs ou ingredientComplement
  unite: Unite;
  ordre: number;
  remarque?: string;
  ingredientComplement?: boolean; // ligne « qsp » (ex. eau) : quantité calculée automatiquement (Fonction B)
  qs?: boolean;                   // ligne « quantité suffisante » (ex. soude) : ignorée par tous les calculs
}

/**
 * Synthèse dérivée d'une fiche (MA, eau qsp, contrôle du total).
 *
 * ⚠️ Valeurs CALCULÉES, jamais persistées : renvoyées par le backend dans les DTO
 * de lecture et recalculées à la volée côté front. Voir FormulationCalculService (backend)
 * et production-formulation-calcul.ts (frontend).
 */
export interface SyntheseFormulation {
  maTotaleKg: number | null;      // Σ(dosage × matiereActivePct/100) des lignes comptées
  maPct: number | null;           // maTotaleKg / quantiteRef × 100 (null si quantiteRef absent/0)
  eauQspKg: number | null;        // quantiteRef − Σ(autres lignes) ; null si aucune ligne qsp ou si négatif
  totalSaisiKg: number;           // Σ(dosage des lignes non-qs), eau qsp incluse
  ecartTolerancePct: number | null; // |totalSaisi − quantiteRef| / quantiteRef × 100 (null si quantiteRef absent/0)
  totalConforme: boolean;         // écart ≤ tolérance
  nbLignesComplement: number;     // nombre de lignes marquées qsp (doit être ≤ 1)
  warnings: string[];             // avertissements non bloquants (MP cochée sans MA, eau négative…)
}

export interface EtapeProcessus {
  ordre: number;
  libelle: string;
  dureeMinutes?: number;
  temperature?: number;          // °C
  pression?: number;             // bar
  vitesseAgitation?: number;     // tr/min
  dureeReposMinutes?: number;
  instructions?: string;         // texte libre
}

export interface VersionFormulation {
  numero: number;
  dateModification: string;      // ISO yyyy-MM-dd ou yyyy-MM-ddTHH:mm:ss
  auteur: string;
  motif?: string;
  ingredients: IngredientFormulation[];
  etapes: EtapeProcessus[];
  dureePeremptionJours: number;
}

export interface FicheFormulation {
  id?: string;
  code: string;                  // unique
  nom: string;
  description?: string;
  versionCourante: number;
  ingredients: IngredientFormulation[];
  etapes: EtapeProcessus[];
  dureePeremptionJours: number;  // règle de calcul de la date de péremption des lots
  quantiteRef: number;           // taille du lot de référence pour les dosages (en uniteProduction)
  uniteProduction: Unite;        // unité de la quantité cible des OF référençant cette fiche
  statut: StatutFormulation;
  versions: VersionFormulation[];
  synthese?: SyntheseFormulation; // ⚠️ calculé côté serveur, jamais persisté (lecture seule)
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FiltreFormulation {
  q?: string;
  statut?: StatutFormulation;
}

export interface ComparaisonVersions {
  formulationId: string;
  versionA: VersionFormulation;
  versionB: VersionFormulation;
  diffIngredients: DiffIngredient[];
  diffEtapes: DiffEtape[];
  diffPeremption?: { avant: number; apres: number };
}

export interface DiffIngredient {
  matierePremiereId: string;
  matierePremiereNom?: string;
  type: 'AJOUT' | 'SUPPRESSION' | 'MODIFICATION';
  avant?: IngredientFormulation;
  apres?: IngredientFormulation;
}

export interface DiffEtape {
  ordre: number;
  type: 'AJOUT' | 'SUPPRESSION' | 'MODIFICATION';
  avant?: EtapeProcessus;
  apres?: EtapeProcessus;
}
