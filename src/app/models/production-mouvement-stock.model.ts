/**
 * Modèles pour les Mouvements de Stock Chimie — Module Production Chimie (5.1).
 *
 * Tout mouvement (entrée/sortie/ajustement) est tracé. Les sorties sont
 * automatiquement créées au lancement d'un OF ; les entrées sont saisies à
 * la réception fournisseur. Les ajustements permettent de corriger un
 * inventaire physique.
 */

import { Unite } from './production-matiere-premiere.model';

export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';

export interface MouvementStockChimie {
  id?: string;
  matierePremiereId: string;
  matierePremiereCode?: string;
  matierePremiereNom?: string;
  unite?: Unite;
  type: TypeMouvement;
  quantite: number;              // toujours positif ; le type indique le sens
  date: string;                  // ISO
  ordreFabricationId?: string;   // renseigné pour les sorties liées à un OF
  ordreFabricationNumero?: string;
  lotFournisseur?: string;       // pour les entrées
  fournisseur?: string;
  datePeremption?: string;       // pour les entrées
  commentaire?: string;
  auteurId?: string;
  auteurNom?: string;
}

export interface ReceptionMpPayload {
  matierePremiereId: string;
  quantite: number;
  fournisseur?: string;
  lotFournisseur?: string;
  datePeremption?: string;
  commentaire?: string;
}

export interface AjustementMpPayload {
  matierePremiereId: string;
  nouvelleQuantite: number;
  commentaire: string;           // obligatoire pour traçabilité
}

export interface FiltreMouvement {
  matierePremiereId?: string;
  type?: TypeMouvement;
  ordreFabricationId?: string;
  dateDebut?: string;
  dateFin?: string;
}
