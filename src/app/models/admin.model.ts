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
  Dashboard: boolean;
  Admin: boolean;
  StatistiquesAgences: boolean;
  Planifications: boolean;
  Calendrier: boolean;
  Stock: boolean;
  CollecteLivraison: boolean;
  JourFeries: boolean;
  Employes: boolean;
  Agences: boolean;
  Absences: boolean;
  Pointages: boolean;
}
