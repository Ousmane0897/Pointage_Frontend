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

/**
 * Enfant à charge d'un employé.
 *
 * ⚠ `dateNaissance` est une chaîne **`yyyy-MM-dd`** et non une `Date` : elle ne transite
 * que par des `<input type="date">`, et passer par `toISOString()` décalerait d'un jour
 * selon le fuseau.
 *
 * C'est cette date, et non le compteur `nombreEnfants`, qui ouvre le droit à congé
 * supplémentaire par enfant : elle seule permet de trancher la condition d'âge, et de
 * recalculer un exercice clos à l'identique.
 */
export interface EnfantEmploye {
  /** Posé serveur. Le renvoyer conserve l'identité de la ligne. */
  id?: string;
  prenom: string;
  dateNaissance: string | null;
}

/**
 * Âge en années révolues à une date de référence (`yyyy-MM-dd` des deux côtés).
 *
 * ⚠ **Affichage uniquement.** Le droit est calculé serveur ; ce helper ne sert qu'à
 * montrer à la RH ce que sa saisie produira. Renvoie `null` si la date manque ou est
 * postérieure à la référence.
 */
export function ageAu(dateNaissance: string | null | undefined, reference: string): number | null {
  if (!dateNaissance) return null;
  const naissance = dateNaissance.slice(0, 10);
  const ref = reference.slice(0, 10);
  if (naissance > ref) return null;

  const [an, am, aj] = naissance.split('-').map(Number);
  const [rn, rm, rj] = ref.split('-').map(Number);
  let age = rn - an;
  // L'anniversaire n'est pas encore passé cette année-là.
  if (rm < am || (rm === am && rj < aj)) age -= 1;
  return Math.max(0, age);
}

/** 31 décembre de l'exercice — la date à laquelle le serveur apprécie âge et ancienneté. */
export function referenceExercice(annee: number): string {
  return `${annee}-12-31`;
}

/**
 * Enfants ayant strictement moins de `ageMax` ans au 31/12 de l'exercice.
 * ⚠ Miroir d'affichage du calcul serveur — jamais une source de droit.
 */
export function enfantsBeneficiairesAu(
  enfants: EnfantEmploye[] | null | undefined,
  annee: number,
  ageMax: number,
): EnfantEmploye[] {
  const ref = referenceExercice(annee);
  return (enfants ?? []).filter(e => {
    const age = ageAu(e.dateNaissance, ref);
    return age !== null && age < ageMax;
  });
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
  /**
   * Compteur historique. **Dérivé serveur** de `enfants` dès que cette liste est
   * renseignée, et jamais effacé quand elle est vide — les dossiers antérieurs à la
   * saisie datée ne portent que lui.
   */
  nombreEnfants?: number;
  /** Enfants à charge datés — alimente le droit à congé supplémentaire par enfant. */
  enfants?: EnfantEmploye[];

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
