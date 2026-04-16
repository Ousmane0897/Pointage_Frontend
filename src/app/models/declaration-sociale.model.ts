/**
 * Modèle de données pour les Déclarations Sociales — Paie (6.3).
 *
 * Agrège les bulletins d'une période pour produire les déclarations
 * réglementaires : IPRES, CSS, Inspection du Travail.
 */

export type TypeDeclaration =
  | 'IPRES_MENSUELLE'
  | 'IPRES_ANNUELLE'
  | 'CSS_MENSUELLE'
  | 'CSS_ANNUELLE'
  | 'INSPECTION_TRAVAIL';

export type StatutDeclaration = 'BROUILLON' | 'GENEREE' | 'TRANSMISE' | 'ARCHIVEE';

/** Une ligne de déclaration correspond généralement à un employé. */
export interface LigneDeclaration {
  employeId: string;
  matricule: string;
  nom: string;
  prenom: string;
  numeroIpres?: string;
  numeroCss?: string;

  brutImposable: number;
  assietteIpres: number;
  cotisationIpresSalarie: number;
  cotisationIpresEmployeur: number;
  assietteCss: number;
  cotisationCssSalarie: number;
  cotisationCssEmployeur: number;
  impotRevenu: number;
  trimf: number;

  joursTravailles?: number;
}

export interface DeclarationSociale {
  id?: string;
  type: TypeDeclaration;
  libelle: string;                 // ex : "IPRES — Avril 2026"

  // Période couverte (mois/annee pour mensuelle, annee seule pour annuelle)
  mois?: number;
  annee: number;

  lignes: LigneDeclaration[];

  // Totaux agrégés pour la période
  totalBrut: number;
  totalIpresSalarie: number;
  totalIpresEmployeur: number;
  totalCssSalarie: number;
  totalCssEmployeur: number;
  totalIr: number;
  totalTrimf: number;
  totalPayable: number;            // montant à verser à l'organisme

  effectif: number;                // nombre d'employés concernés

  statut: StatutDeclaration;
  dateGeneration?: string;
  dateTransmission?: string;
  referenceExterne?: string;       // n° de dossier IPRES / CSS après transmission
  commentaire?: string;
}

export interface FiltreDeclaration {
  type?: TypeDeclaration;
  mois?: number;
  annee?: number;
  statut?: StatutDeclaration;
}

export const LIBELLES_TYPE_DECLARATION: Record<TypeDeclaration, string> = {
  IPRES_MENSUELLE:    'IPRES — Déclaration mensuelle',
  IPRES_ANNUELLE:     'IPRES — Déclaration annuelle',
  CSS_MENSUELLE:      'CSS — Déclaration mensuelle',
  CSS_ANNUELLE:       'CSS — Déclaration annuelle',
  INSPECTION_TRAVAIL: 'Inspection du Travail',
};
