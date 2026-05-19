/**
 * Modèles pour le Tableau de Bord Production — Module Production Chimie (5.1).
 *
 * Agrégations consommées par le composant `TableauBordProductionComponent` :
 * KPIs cards en haut + 4 graphiques (volumes/produit, évolution mensuelle,
 * rendements théorique vs réel, répartition statut CQ). Comparaison de
 * périodes pour suivre les tendances.
 */

export interface FiltreTableauBord {
  dateDebut: string;             // ISO yyyy-MM-dd
  dateFin: string;
  produitNom?: string;
  operateurId?: string;
}

export interface KpiProductionPeriode {
  volumeProduit: number;         // en L (converti côté backend pour homogénéité)
  nbOfTermines: number;
  nbOfAnnules: number;
  tauxReussiteCq: number;        // 0..1
  tauxPerteMoyen: number;        // 0..1 — écart théorique / réel
  nbLotsValides: number;
  nbLotsRejetes: number;
  nbLotsEnStock: number;
}

export interface VolumeParProduit {
  produitNom: string;
  volumeTotal: number;
  nbOfTermines: number;
}

export interface EvolutionMensuelle {
  mois: string;                  // "2026-05"
  volume: number;
  nbOf: number;
}

export interface RendementProduit {
  produitNom: string;
  rendementTheorique: number;    // total théorique en L sur la période
  rendementReel: number;
  ecart: number;                 // %, positif = excédent, négatif = perte
}

export interface RepartitionStatutCq {
  valides: number;
  rejetes: number;
  enAttente: number;
}

export interface ComparaisonPeriodes {
  actuelle: KpiProductionPeriode;
  precedente: KpiProductionPeriode;
  variations: {
    volumeProduit: number;       // % d'évolution
    nbOfTermines: number;
    tauxReussiteCq: number;
    tauxPerteMoyen: number;
  };
}

export interface RapportTableauBord {
  filtre: FiltreTableauBord;
  kpi: KpiProductionPeriode;
  volumesParProduit: VolumeParProduit[];
  evolutionMensuelle: EvolutionMensuelle[];
  rendements: RendementProduit[];
  repartitionCq: RepartitionStatutCq;
  comparaison?: ComparaisonPeriodes;
}
