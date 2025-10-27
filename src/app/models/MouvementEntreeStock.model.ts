export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
//export type MotifMouvement = 'RECEPTION_FOURNISSEUR' | 'RETOUR_EN_STOCK' | 'PRODUCTION_INTERNE' | 'AJUSTEMENT_INVENTAIRE' | 'VENTE' | 'DESTINATION_AGENCE' | 'DESTRUCTION' | 'DON' | 'CASSE' | 'AUTRE';
export type MotifMouvementEntreeStock = 'RECEPTION_FOURNISSEUR' | 'RETOUR_EN_STOCK' | 'PRODUCTION_INTERNE' | 'AJUSTEMENT_INVENTAIRE';

export interface MouvementEntreeStock {
  id?: string;
  codeProduit: string;
  nomProduit?: string;
  type: TypeMouvement;
  quantite: number;
  //source?: string;
  //reference?: string;
  responsable?: string;
  motifMouvement?: MotifMouvementEntreeStock;
  fournisseur?: string;
  numeroFacture?: string;
  //warehouse?: string;
  //lotNumber?: string;
  //destination?: string; // En cas de livraison de produits dans les agences,chantiers ou vente
  //mois?: string; // A renseigner coté backend pour les rapports mensuels
  dateDePeremption: Date | null;
  dateMouvement: Date | null;
  //costUnit?: number;
}
