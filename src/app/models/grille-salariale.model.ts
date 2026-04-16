/**
 * Modèle de données pour la Grille Salariale — Paie (6.3).
 *
 * Une CatégorieProfessionnelle regroupe un ensemble d'employés partageant
 * la même base de rémunération. Chaque employé est rattaché à une catégorie
 * qui fournit les valeurs par défaut pour son bulletin de paie.
 */

export interface PrimeCategorie {
  libelle: string;       // ex : "Prime de transport"
  montant: number;       // FCFA
  imposable: boolean;    // soumise à l'IR ?
  soumiseIpres: boolean; // soumise aux cotisations IPRES ?
  soumiseCss: boolean;   // soumise aux cotisations CSS ?
}

export interface IndemniteCategorie {
  libelle: string;       // ex : "Indemnité de logement"
  montant: number;       // FCFA
  imposable: boolean;
}

export type RegimeIpres = 'REGIME_GENERAL' | 'REGIME_COMPLEMENTAIRE';

export interface CategorieProfessionnelle {
  id?: string;
  code: string;                    // ex : "CADRE", "EMPLOYE", unique
  libelle: string;                 // ex : "Cadre supérieur"
  description?: string;

  salaireBase: number;             // salaire de base mensuel en FCFA

  primes: PrimeCategorie[];        // liste libre, configurée par RH
  indemnites: IndemniteCategorie[];

  regimeIpres: RegimeIpres;        // détermine l'application du régime complémentaire
  tauxAtMp?: number;               // override optionnel du taux AT/MP (ex 0.05 pour secteur à risque)

  actif: boolean;                  // une catégorie peut être désactivée sans être supprimée
  dateCreation?: string;
  dateModification?: string;
}

export interface FiltreGrilleSalariale {
  q?: string;                      // recherche libre (code/libellé)
  regimeIpres?: RegimeIpres;
  actif?: boolean;
}
