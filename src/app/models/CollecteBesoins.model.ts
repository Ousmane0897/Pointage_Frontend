export interface CollecteBesoins {
  id?: string;
  destination: string;
  responsable: string;
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'LIVREE';
  dateDemande?: string;
  dateLivraison?: string;
  heureLivraison?: string;
  nombreModifications?: number;
  produitsDemandes: BesoinProduit[];
  anciensProduitsDemandes?: BesoinProduit[];
  historiqueModifications?: string[];
  moisActuel?: string;

}

export interface BesoinProduit {
  codeProduit: string;
  nomProduit: string;
  quantite: number;
}
