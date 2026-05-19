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
  dosage: number;                // quantité par unité de production
  unite: Unite;
  ordre: number;
  remarque?: string;
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
  uniteProduction: Unite;        // unité de la quantité cible des OF référençant cette fiche
  statut: StatutFormulation;
  versions: VersionFormulation[];
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
