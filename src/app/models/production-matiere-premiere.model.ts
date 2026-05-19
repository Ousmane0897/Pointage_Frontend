/**
 * Modèles pour les Matières Premières (MP) chimiques — Module Production
 * Chimie (5.1).
 *
 * Service dédié `stock-chimie.service.ts`, totalement INDÉPENDANT du module
 * Stock existant (collection MongoDB dédiée côté backend, à confirmer dans
 * la session backend ultérieure).
 */

export type Unite = 'KG' | 'G' | 'L' | 'ML' | 'PIECE';

export interface MatierePremiere {
  id?: string;
  code: string;                  // unique
  nom: string;
  unite: Unite;
  seuilCritique: number;         // alerte si quantité en stock passe sous ce seuil
  fournisseur?: string;
  ficheSecuriteUrl?: string;
  ficheSecuriteNom?: string;
  quantiteEnStock: number;       // dénormalisé pour affichage rapide
  actif: boolean;
  remarque?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltreMatierePremiere {
  q?: string;                    // recherche libre (code/nom)
  sousSeuilCritique?: boolean;
  actif?: boolean;
}
