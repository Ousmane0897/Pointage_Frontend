export interface CollecteBesoins {
  id?: string;
  destination: string;
  responsable: string;
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'LIVREE';
  dateDemande?: string;
  produitsDemandes: BesoinProduit[];
  historiqueModifications?: string[];
  moisAnnee?: string;

}

export interface BesoinProduit {
  codeProduit: string;
  nomProduit: string;
  quantite: number;
}
