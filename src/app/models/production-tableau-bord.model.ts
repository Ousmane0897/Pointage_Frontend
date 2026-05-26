export interface FiltreTableauBord {
  dateDebut: string;
  dateFin: string;
  produitNom?: string;
  operateurId?: string;
}

export interface KpiProductionPeriode {
  dateDebut: string;
  dateFin: string;
  volumeProduitLitres: number;
  nbOfTermines: number;
  nbOfAnnules: number;
  tauxReussiteCq: number;        // 0..1
  tauxPerteMoyen: number;        // 0..1
  nbLotsValide: number;
  nbLotsRejete: number;
  nbLotsEnAttenteControle: number;
  nbLotsTotaux: number;
}

export interface VolumeParProduit {
  produitNom: string;
  volumeLitres: number;
  nbLots: number;
}

export interface EvolutionMensuelle {
  mois: string;                  // "2026-05"
  volumeLitres: number;
  nbLots: number;
}

export interface RendementProduit {
  produitNom: string;
  sommeQuantiteTheorique: number;
  sommeQuantiteReelle: number;
  ecartPourcent: number;
  nbOfTermines: number;
}

export interface RepartitionStatutCq {
  valides: number;
  rejetes: number;
  enAttente: number;
}

export interface ComparaisonPeriodes {
  periodeCourante: KpiProductionPeriode;
  periodePrecedente: KpiProductionPeriode;
  deltaVolumePourcent: number;
  deltaTauxReussitePoints: number;
  deltaNbOfTerminesPourcent: number;
}

export interface RapportTableauBord {
  kpis: KpiProductionPeriode;
  volumesParProduit: VolumeParProduit[];
  evolutionMensuelle: EvolutionMensuelle[];
  rendements: RendementProduit[];
  repartitionCq: RepartitionStatutCq;
  comparaison?: ComparaisonPeriodes;
}
