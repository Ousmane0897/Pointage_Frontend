/**
 * DTOs financiers — 7.6 Coût de consommation par site.
 *
 * Agrégation serveur des sorties EFFECTIVES valorisées par site sur une période.
 * Modèles d'affichage uniquement. Montants FCFA entiers.
 */

/** Coût de consommation d'un site sur la période. */
export interface CoutSite {
  siteId: string;
  siteNom: string;
  coutTotal: number;             // FCFA — sorties valorisées
  nbSorties: number;
  quantiteTotale: number;
  pourcentage: number;           // part du coût total inter-sites (%)
  coutMoyenReference?: number;   // FCFA — moyenne inter-sites ou N-1
  ecartPct?: number;             // % vs référence
  surconsommation: boolean;      // true si écart au-delà du seuil de dérive
}

/** Comparatif inter-sites complet. */
export interface ComparatifCoutSites {
  lignes: CoutSite[];            // triées par coût décroissant (ranking)
  coutTotalGlobal: number;       // FCFA
  coutMoyenParSite: number;      // FCFA
  nbSitesSurconsommation: number;
  dateDebut: string;
  dateFin: string;
}

export interface FiltreCoutSite {
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin: string;               // ISO yyyy-MM-dd
  categorieId?: string;
}
