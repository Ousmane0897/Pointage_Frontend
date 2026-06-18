export type DropdownMenu =
  | 'operations'
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
  rh: boolean;

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

  // ─── Stock v2 — 7.3 Stocks & Approvisionnement ──────────────────────
  // Optionnel pour rester rétrocompatible avec les JWT existants qui
  // n'embarquent pas encore ce champ. Le backend devra ajouter
  // `modules.stock` au claim JWT pour activer ce menu en production.
  stock?: {
    catalogue?: boolean;
    mouvements?: boolean;
    etatStock?: boolean;
    inventaires?: boolean;
    synthese?: boolean;
    approvisionnement?: boolean;
    tableauBord?: boolean;

    // ─── Stock v2 — 7.4 Contrôle des mouvements ──────────────────────
    // Sous-flags additionnels (rétrocompatibles). Le backend doit les
    // ajouter au claim JWT `modules.stock` pour activer la section.
    categorisation?: boolean;        // catégorisation entrées/sorties + stats
    bonsEntree?: boolean;            // bons d'entrée numériques
    bonsSortie?: boolean;            // bons de sortie numériques
    workflowValidation?: boolean;    // tableau de workflow (Kanban)
    historiqueDestinataire?: boolean;// historique consommation par destinataire
    plafonds?: boolean;              // plafonds de dotation
    dotation?: boolean;              // dotation prévue vs réelle
    rapportsConso?: boolean;         // rapports de consommation

    // ─── Stock v2 — 7.5 Analyse des consommations (lecture seule) ────
    analyseMensuelle?: boolean;      // vue mensuelle par site
    chantiers?: boolean;             // consommations fin de chantier
    dons?: boolean;                  // consommations dons
    comparatif?: boolean;            // comparatif mensuel
    filtresCroises?: boolean;        // analyse multidimensionnelle
  };
}
