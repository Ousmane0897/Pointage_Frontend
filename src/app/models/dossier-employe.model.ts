/**
 * Modèle de données pour le dossier employé – Gestion du Personnel
 */

export interface ContactUrgence {
  nom: string;
  lienParente: string;
  telephone: string;
}

export type SituationMatrimoniale = 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';

/** Semaine ouvrée sur un site. */
export type JoursTravail = 'LUN_VEN' | 'LUN_SAM' | 'LUN_DIM';

/**
 * Libellés des semaines ouvrées — point unique de vérité, à côté du type.
 * Le module RH duplique déjà ses libellés de mois dans six fichiers : ne pas
 * recopier cette map dans les composants qui l'affichent.
 */
export const LIBELLES_JOURS_TRAVAIL: Record<JoursTravail, string> = {
  LUN_VEN: 'Lundi - Vendredi',
  LUN_SAM: 'Lundi - Samedi',
  LUN_DIM: 'Lundi - Dimanche',
};

/** Même map, sous la forme de liste attendue par les `<select>`. */
export const OPTIONS_JOURS_TRAVAIL: ReadonlyArray<{ valeur: JoursTravail; libelle: string }> =
  (Object.keys(LIBELLES_JOURS_TRAVAIL) as JoursTravail[]).map(valeur => ({
    valeur,
    libelle: LIBELLES_JOURS_TRAVAIL[valeur],
  }));

/** Libellé d'une semaine ouvrée, avec le repli par défaut Lundi - Vendredi. */
export function libelleJoursTravail(valeur: JoursTravail | null | undefined): string {
  return LIBELLES_JOURS_TRAVAIL[valeur ?? 'LUN_VEN'];
}

/**
 * Affectation d'un employé à un site : tranche horaire optionnelle, période de
 * présence et semaine ouvrée — ces trois dernières informations étant **propres au
 * site** (un agent multi-sites peut y être arrivé à des dates différentes et n'y pas
 * travailler les mêmes jours).
 *
 * `site` = nom du site (référentiel « Sites clients »). Les horaires sont au format
 * "HH:mm", les dates au format "yyyy-MM-dd" (elles ne transitent que par des
 * `<input type="date">`).
 */
export interface AffectationSite {
  site: string;
  horaireDebut?: string; // "HH:mm", ex. "06:00" — optionnel
  horaireFin?: string;   // "HH:mm", ex. "12:00" — optionnel
  /** Arrivée de l'employé SUR CE SITE (≠ date d'embauche dans l'entreprise). */
  dateEntree: string | null;
  /** Départ de ce site. Absent ⇒ l'employé y est toujours en poste (sortie inconnue). */
  dateSortie?: string | null;
  /** Semaine ouvrée PROPRE À CE SITE. */
  joursTravail: JoursTravail;
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
  affectations?: AffectationSite[]; // sites + horaires + période + jours ouvrés (source structurée)
  dateEmbauche: Date | null;      // entrée dans l'entreprise (≠ AffectationSite.dateEntree)
  statut: 'ACTIF' | 'EN_PERIODE_ESSAI' | 'SUSPENDU' | 'SORTI';
  superieurHierarchiqueId?: string;
  superieurHierarchiqueNom?: string;
  dureeEssaiMois?: number;

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
