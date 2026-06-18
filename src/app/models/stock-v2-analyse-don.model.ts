/**
 * DTOs analytiques — 7.5 Consommations dons.
 *
 * Agrégation des sorties de type `DON` (cf. stock-v2-bon-sortie.model.ts) selon
 * leur `natureDon` et leur bénéficiaire. Valorisation FCFA via `prixUnitaire`.
 * Modèles d'affichage uniquement — aucune entité persistée propre.
 */

import { NatureDon } from './stock-v2-bon-sortie.model';

/** Filtres de la vue dons. */
export interface FiltreAnalyseDon {
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin: string;               // ISO yyyy-MM-dd
  natureDon?: NatureDon;
  beneficiaire?: string;
  siteId?: string;
}

/** Ligne agrégée : un bon de don (ou un regroupement). */
export interface LigneDon {
  bonId?: string;
  reference?: string;            // BS-AAAAMMJJ-XXX
  date: string;                  // ISO yyyy-MM-dd
  natureDon: NatureDon;
  beneficiaire?: string;
  siteSourceNom?: string;
  nbProduits: number;
  quantiteTotale: number;
  montant: number;               // FCFA
}

/** Élément d'un classement (répartition nature / top bénéficiaires). */
export interface ElementDon {
  libelle: string;
  montant: number;               // FCFA
  nombre?: number;               // nombre de dons
}

/** Point d'évolution mensuelle des dons. */
export interface PointEvolutionDon {
  mois: string;                  // 'YYYY-MM'
  montant: number;               // FCFA
}

/** KPIs synthétiques des dons. */
export interface KpisDons {
  montantTotal: number;          // FCFA
  nbDons: number;
  nbBeneficiaires: number;
  evolutionPct?: number;         // % vs période précédente équivalente
}

/** Synthèse complète des dons pour une période. */
export interface SyntheseDons {
  kpis: KpisDons;
  lignes: LigneDon[];
  repartitionNature: ElementDon[];           // donut (par natureDon)
  topBeneficiaires: ElementDon[];            // bar chart
  evolutionMensuelle: PointEvolutionDon[];   // line chart
}
