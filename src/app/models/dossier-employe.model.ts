/**
 * Modèle de données pour le dossier employé – Gestion du Personnel
 */

export interface ContactUrgence {
  nom: string;
  lienParente: string;
  telephone: string;
}

export type SituationMatrimoniale = 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';

/** Semaine ouvrée de l'employé. */
export type JoursTravail = 'LUN_VEN' | 'LUN_SAM' | 'LUN_DIM';

/**
 * Affectation d'un employé à un site, avec une tranche horaire de travail optionnelle.
 * `site` = nom du site (référentiel « Sites clients »). Les horaires sont au format "HH:mm".
 */
export interface AffectationSite {
  site: string;
  horaireDebut?: string; // "HH:mm", ex. "06:00" — optionnel
  horaireFin?: string;   // "HH:mm", ex. "12:00" — optionnel
}

export interface DossierEmploye {
  id?: string;
  agentId: string;   // code 4 chiffres pour le pointage (= codeSecret côté backend)
  matricule: string;

  // Identité
  nom: string;
  prenom: string;
  dateNaissance: Date | null;
  genre: 'HOMME' | 'FEMME';
  nationalite: string;
  photoUrl?: string;
  numeroIdentification?: string;
  situationMatrimoniale?: SituationMatrimoniale;
  nombreEnfants?: number;

  // Poste
  poste: string;
  departement: string;
  siteAffecte: string;            // dérivé : noms des sites joints par « - » (rétro-compat)
  affectations?: AffectationSite[]; // sites + tranches horaires (source structurée)
  dateEntree: Date | null;
  statut: 'ACTIF' | 'EN_PERIODE_ESSAI' | 'SUSPENDU' | 'SORTI';
  superieurHierarchiqueId?: string;
  superieurHierarchiqueNom?: string;
  dureeEssaiMois?: number;
  joursTravail?: JoursTravail;

  // Contacts
  telephone: string;
  email: string;
  adresse: string;

  // Urgence
  contactUrgence: ContactUrgence;
}

export interface FiltreEmploye {
  departement?: string;
  site?: string;
  poste?: string;
  statut?: string;
  q?: string;
}
