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

  // ─── Exploitation v2 — Production Chimie (5.1) ──────────────────────
  // Optionnel pour rester rétrocompatible avec les JWT existants qui
  // n'embarquent pas encore ce champ.
  productionChimie?: {
    formulations?: boolean;
    ordresFabrication?: boolean;
    lots?: boolean;
    controleQualite?: boolean;
    matieresPremieres?: boolean;
    conditionnement?: boolean;
    tableauBord?: boolean;
  };

  // ─── Exploitation v2 — Terrain (5.2) ────────────────────────────────
  // Optionnel pour rester rétrocompatible avec les JWT existants qui
  // n'embarquent pas encore ce champ. Le backend devra ajouter
  // `modules.terrain` au claim JWT pour activer ce menu en production.
  terrain?: {
    sitesClients?: boolean;
    planning?: boolean;
    pointage?: boolean;
    alertes?: boolean;
    interventions?: boolean;
    controleQualite?: boolean;
    materiel?: boolean;
    phytosanitaire?: boolean;
    tableauBord?: boolean;
  };
}
