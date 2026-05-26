/**
 * Modèles pour le Tableau de Bord Exploitation Terrain — (5.2).
 *
 * Agrégations consommées par `TableauBordTerrainComponent` : KPIs en cards
 * (couverture, interventions, satisfaction, incidents) + 4 graphiques
 * (interventions par site, évolution couverture, répartition incidents,
 * évolution satisfaction). Comparaison de périodes (mois en cours vs N-1).
 */

import { DecisionControleTerrain } from './terrain-controle-qualite.model';

export interface FiltreTableauBordTerrain {
  dateDebut: string;                   // ISO yyyy-MM-dd
  dateFin: string;
  siteId?: string;
  employeId?: string;
  typeIntervention?: string;
}

export interface KpiTerrain {
  dateDebut: string;
  dateFin: string;

  // Couverture
  nbAffectationsPlanifiees: number;
  nbInterventionsRealisees: number;
  tauxCouverture: number;              // 0..1

  // Activité
  nbAgentsActifs: number;
  nbSitesActifs: number;

  // Qualité
  satisfactionMoyenne: number;         // 0..5 — moyenne des noteGlobale CQ
  nbControles: number;
  nbControlesConformes: number;

  // Incidents
  nbIncidents: number;                 // alertes ABSENCE + DEPART_PREMATURE + POINTAGE_HORS_ZONE
  nbAlertesEscaladees: number;
}

export interface InterventionsParSite {
  siteId: string;
  siteCode: string;
  siteNom: string;
  nbInterventions: number;
  nbPrevues: number;
  tauxCouverture: number;              // 0..1
}

export interface PointEvolution {
  date: string;                        // yyyy-MM-dd ou yyyy-MM
  valeur: number;
}

export interface IncidentsParSite {
  siteId: string;
  siteNom: string;
  nbIncidents: number;
  parType: Record<string, number>;     // RETARD | ABSENCE | HORS_ZONE | DEPART_PREMATURE
}

export interface SatisfactionParSite {
  siteId: string;
  siteNom: string;
  noteMoyenne: number;
  nbControles: number;
  decisionMajoritaire: DecisionControleTerrain;
}

export interface ComparaisonPeriodesTerrain {
  periodeCourante: KpiTerrain;
  periodePrecedente: KpiTerrain;
  deltaCouverturePoints: number;
  deltaInterventionsPourcent: number;
  deltaSatisfactionPoints: number;
  deltaIncidentsPourcent: number;
}

export interface RapportTableauBordTerrain {
  kpis: KpiTerrain;
  interventionsParSite: InterventionsParSite[];
  evolutionCouverture: PointEvolution[];
  incidentsParSite: IncidentsParSite[];
  evolutionSatisfaction: PointEvolution[];
  comparaison?: ComparaisonPeriodesTerrain;
}
