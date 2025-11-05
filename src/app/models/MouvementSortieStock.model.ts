export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
export type MotifMouvementSortieStock = 'VENTE' | 'DESTINATION_AGENCE' | 'DESTRUCTION' | 'DON' | 'CASSE' | 'CHANTIER' | 'INTERNE';



// Pour une seule sortie de stock d'un produit
export interface MouvementSortieStock {
    id?: string;
    codeProduit: string;
    nomProduit?: string;
    quantite: number;
    typeMouvement: TypeMouvement;
    destination: string; // agence 
    motifSortieStock: MotifMouvementSortieStock;
    responsable: string;
    mois?: string; // A renseigner coté backend pour les rapports mensuels
    dateMouvement: Date | null;

}

// Pour les sorties de stock de plusieurs produits en une seule opération
export interface SortieStockBatch {
    mouvements: {
        codeProduit: string;
        nomProduit?: string;
        quantite: number;
    }[]; // Tableau des produits à sortir du stock
    typeMouvement: TypeMouvement;
    destination: string; // agence ou chantier
    motifSortieStock: MotifMouvementSortieStock;
    responsable: string;
    mois?: string; // A renseigner coté backend pour les rapports mensuels
    dateMouvement: Date | null;

}