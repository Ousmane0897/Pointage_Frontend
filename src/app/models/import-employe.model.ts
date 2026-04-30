import { SituationMatrimoniale } from './dossier-employe.model';

export interface DossierEmployeImportPayload {
  numeroLigne: number;
  matricule: string;

  nom: string;
  prenom: string;
  dateNaissance: string;
  genre: 'HOMME' | 'FEMME';
  nationalite: string;
  numeroIdentification?: string;
  situationMatrimoniale?: SituationMatrimoniale;
  nombreEnfants?: number;

  poste: string;
  departement: string;
  siteAffecte: string;
  dateEntree: string;
  statut: 'ACTIF' | 'EN_PERIODE_ESSAI' | 'SUSPENDU' | 'SORTI';
  superieurHierarchiqueMatricule?: string;
  dureeEssaiMois?: number;

  telephone: string;
  email: string;
  adresse: string;

  contactUrgence: {
    nom: string;
    lienParente: string;
    telephone: string;
  };
}

export interface DossierEmployeBulkPayload {
  employes: DossierEmployeImportPayload[];
}

export interface ErreurImport {
  numeroLigne: number;
  colonne: string;
  valeurRecue: unknown;
  message: string;
}

export interface LigneImport {
  numeroLigne: number;
  brut: Record<string, unknown>;
  payload?: DossierEmployeImportPayload;
  erreurs: ErreurImport[];
}

export interface ResultatValidation {
  lignes: LigneImport[];
  total: number;
  valides: number;
  enErreur: number;
  erreurs: ErreurImport[];
}

export interface EchecImport {
  numeroLigne: number;
  matricule: string;
  message: string;
}

export interface ResultatImport {
  succes: number;
  echecs: EchecImport[];
}

/**
 * Forme exacte renvoyée par le backend (POST /gestion-personnel/employes/bulk).
 * Mappée vers `ResultatImport` dans `DossierEmployeService.importerBulk()`.
 * 200 OK (tout inséré), 207 Multi-Status (import partiel) et 422 Unprocessable
 * Entity (TOUT_OU_RIEN avec erreurs) renvoient tous ce même corps.
 */
export interface BackendBulkImportResponse {
  total: number;
  inserted: number;
  failed: number;
  insertedIds: string[];
  errors: BackendBulkImportError[];
}

export interface BackendBulkImportError {
  lineNumber?: number;
  numeroLigne?: number;
  matricule?: string;
  message?: string;
  field?: string;
}

export const COLONNES_TEMPLATE: readonly string[] = [
  'Matricule *',
  'Nom *',
  'Prénom *',
  'Date de naissance *',
  'Genre *',
  'Nationalité *',
  "Numéro d'identification (CNI)",
  'Situation matrimoniale',
  "Nombre d'enfants",
  'Poste *',
  'Département *',
  'Site affecté *',
  "Date d'entrée *",
  'Statut *',
  'Matricule supérieur hiérarchique',
  "Durée période d'essai (mois)",
  'Téléphone *',
  'Email *',
  'Adresse *',
  'Contact urgence - Nom *',
  'Contact urgence - Lien de parenté *',
  'Contact urgence - Téléphone *',
] as const;
