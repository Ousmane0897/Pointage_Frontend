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
  /**
   * Identifiant stable, généré serveur. Permet de reconnaître une ligne déjà
   * persistée — les dossiers antérieurs au backfill n'en ont pas.
   */
  id?: string;
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

// ─── Sites : chaîne legacy `siteAffecte` ────────────────────────────────────

/** Séparateur utilisé pour recomposer `DossierEmploye.siteAffecte`. */
export const SEPARATEUR_SITES = ' - ';

/** Séparateurs tolérés en lecture : « / », « , » ou « - » entouré d'espaces. */
const SPLIT_SITES = /\s*[/,]\s*|\s+-\s+/;

/**
 * Éclate la chaîne legacy `siteAffecte` en noms de sites.
 *
 * Point unique de vérité : cette regex était dupliquée dans le service employé
 * et le formulaire, et l'onglet Affectations en aurait fait une troisième copie.
 */
export function splitSites(siteAffecte: string | null | undefined): string[] {
  return (siteAffecte ?? '')
    .split(SPLIT_SITES)
    .map(s => s.trim())
    .filter(Boolean);
}

// ─── Affectations : passé / présent / futur ─────────────────────────────────

/**
 * Date du jour au format `yyyy-MM-dd`, en **local** — `toISOString()` décalerait
 * d'un jour selon le fuseau.
 */
function aujourdHuiIso(): string {
  const d = new Date();
  const mois = `${d.getMonth() + 1}`.padStart(2, '0');
  const jour = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Normalise une date d'affectation pour la comparaison : les dates sont des
 * chaînes `yyyy-MM-dd` dont l'ordre lexicographique est exact, aucune conversion
 * `Date` n'est nécessaire ; le `slice` absorbe un datetime renvoyé par le backend.
 */
function jour(valeur: string | null | undefined): string | null {
  return valeur ? valeur.slice(0, 10) : null;
}

/**
 * Affectation close : l'employé a quitté ce site. `aujourdHui` est paramétrable
 * pour que la fonction reste testable sans dépendre du jour d'exécution.
 */
export function affectationTerminee(
  a: AffectationSite,
  aujourdHui: string = aujourdHuiIso(),
): boolean {
  const sortie = jour(a.dateSortie);
  return !!sortie && sortie < aujourdHui;
}

/** Affectation dont l'arrivée sur le site n'a pas encore eu lieu. */
export function affectationAVenir(
  a: AffectationSite,
  aujourdHui: string = aujourdHuiIso(),
): boolean {
  const entree = jour(a.dateEntree);
  return !!entree && entree > aujourdHui;
}

/** Tri chronologique inverse : l'affectation la plus récente en tête. */
function parDateEntreeDecroissante(a: AffectationSite, b: AffectationSite): number {
  return (jour(b.dateEntree) ?? '').localeCompare(jour(a.dateEntree) ?? '');
}

/** Affectations en cours (ou à venir) de l'employé, les plus récentes en tête. */
export function affectationsEnCours(
  employe: Pick<DossierEmploye, 'affectations'> | null | undefined,
  aujourdHui: string = aujourdHuiIso(),
): AffectationSite[] {
  return (employe?.affectations ?? [])
    .filter(a => !affectationTerminee(a, aujourdHui))
    .sort(parDateEntreeDecroissante);
}

/** Affectations closes de l'employé, les plus récentes en tête. */
export function affectationsTerminees(
  employe: Pick<DossierEmploye, 'affectations'> | null | undefined,
  aujourdHui: string = aujourdHuiIso(),
): AffectationSite[] {
  return (employe?.affectations ?? [])
    .filter(a => affectationTerminee(a, aujourdHui))
    .sort(parDateEntreeDecroissante);
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
