export type DropdownMenu =
  | 'operations'
  | 'stock'
  | 'collecte'
  | 'absences'
  | 'pointages'
  | null;


export interface Admin {
  id?: string;
  prenom: string;
  nom: string;
  email: string;
  password: string;
  poste: string;
  role: string;

  // Permissions dynamiques
  modulesAutorises: ModulesAutorises;

  motifDesactivation?: string;
  active: boolean;
}

export interface ModulesAutorises {

  dashboard: boolean;
  admin: boolean;
  statistiquesAgences: boolean;
  planifications: boolean;
  calendrier: boolean;
  jourFeries: boolean;
  employes: boolean;
  agences: boolean;
  rh: boolean;

  collecteLivraison: {
    collecteBesoins: boolean;
    suiviLivraison: boolean;
  };

  absences: {
    tempsReel: boolean;
    historiqueAbsences: boolean;
  };

  pointages: {
    pointagesDuJour: boolean;
    historiquePointages: boolean;
  };

  stock: {
    produits: boolean;
    entrees: boolean;
    sorties: boolean;
    suivis: boolean;
    historiquesEntrees: boolean;
    historiquesSorties: boolean;
  };
}
