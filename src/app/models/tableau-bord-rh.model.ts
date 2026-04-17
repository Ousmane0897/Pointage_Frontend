/**
 * Modèle de données pour le Tableau de Bord RH – Développement RH
 *
 * Agrège les KPIs de l'ensemble du module Ressources Humaines :
 *   6.1 Gestion du Personnel, 6.2 Temps & Présences,
 *   6.3 Paie, 6.4 Développement RH
 */

// ─── Interfaces ───────────────────────────────────────────────────

export interface RepartitionItem {
  label: string;
  value: number;
}

export interface KpiRh {
  // 6.1 – Gestion du Personnel
  effectifTotal: number;
  repartitionDepartement: RepartitionItem[];
  repartitionSite: RepartitionItem[];
  repartitionTypeContrat: RepartitionItem[];
  turnover: number;              // pourcentage

  // 6.2 – Temps & Présences
  tauxAbsenteisme: number;       // pourcentage
  retardsMoyensMinutes: number;
  soldeCongesMoyen: number;

  // 6.3 – Paie
  masseSalarialeMensuelle: number;   // FCFA
  masseSalarialeAnnuelle: number;    // FCFA
  coutMoyenParEmploye: number;       // FCFA

  // 6.4 – Formation
  formationsRealisees: number;
  tauxParticipationFormation: number; // pourcentage

  // 6.4 – Sanctions
  sanctionsParType: RepartitionItem[];
  sanctionsParPeriode: RepartitionItem[];
}

// ─── Filtres ──────────────────────────────────────────────────────

export interface FiltreTableauBord {
  dateDebut?: string;            // yyyy-MM-dd
  dateFin?: string;              // yyyy-MM-dd
  departement?: string;
  site?: string;
}
