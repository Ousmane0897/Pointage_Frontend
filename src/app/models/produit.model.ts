export interface Produit {
  id?: string;
  codeProduit: string;
  nomProduit: string;
  description: string;
  categorie: string;
  destination: string; // usage prévu: vente, agence
  //sousCategorie?: string;
  uniteDeMesure: string;
  conditionnement: string;
  prixDeVente: number;
  emplacement: string;
  seuilMinimum: number;
  statut: 'DISPONIBLE' | 'RUPTURE' | 'BLOQUE_POUR_CONTROLE_QUALITE';
  quantiteSnapshot?: number; // la quantité actuelle en stock, mise à jour périodiquement, à chaque mouvement d'entrée en stock
}
