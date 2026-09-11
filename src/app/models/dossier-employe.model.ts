/**
 * Modèle de données pour le dossier employé – Gestion du Personnel
 */

export interface ContactUrgence {
  nom: string;
  lienParente: string;
  telephone: string;
}

export type SituationMatrimoniale = 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';

/**
 * Semaine ouvrée sur un site.
 *
 * ⚠ `PERSONNALISE` n'est **pas un rythme** mais un *marqueur* : il indique que la semaine
 * ouvrée est portée en clair par `AffectationSite.joursSemaine`. C'est le seul moyen
 * d'exprimer « lundi, mercredi, vendredi » — un rythme que les trois valeurs préréglées ne
 * savent pas décrire, et qui faisait compter l'agent ABSENT les quatre autres jours.
 */
export type JoursTravail = 'LUN_VEN' | 'LUN_SAM' | 'LUN_DIM' | 'PERSONNALISE';

/**
 * Libellés des semaines ouvrées — point unique de vérité, à côté du type.
 * Le module RH duplique déjà ses libellés de mois dans six fichiers : ne pas
 * recopier cette map dans les composants qui l'affichent.
 *
 * ⚠ L'ordre des clés est celui du `<select>` (`OPTIONS_JOURS_TRAVAIL` dérive de
 * `Object.keys`) : `PERSONNALISE` reste **en dernier**, après les trois préréglages.
 */
export const LIBELLES_JOURS_TRAVAIL: Record<JoursTravail, string> = {
  LUN_VEN: 'Lundi - Vendredi',
  LUN_SAM: 'Lundi - Samedi',
  LUN_DIM: 'Lundi - Dimanche',
  PERSONNALISE: 'Jours personnalisés',
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
 * Jour de repos hebdomadaire, exprimé en indice `Date.getDay()` (0 = dimanche … 6 = samedi)
 * pour être directement comparable à une date sans conversion.
 */
export type JourSemaine = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const LIBELLES_JOUR_SEMAINE: Record<JourSemaine, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};

/**
 * Jours de la semaine dans l'ordre de lecture usuel (lundi → dimanche).
 *
 * ⚠ L'**ordre d'affichage** est découplé de la **valeur métier** : `valeur` reste l'indice
 * `getDay()` (0 = dimanche), quelle que soit la position dans la liste. C'est ce qui permet
 * de présenter la semaine à l'endroit tout en stockant l'indice comparable à une date.
 */
export const OPTIONS_JOUR_SEMAINE: ReadonlyArray<{ valeur: JourSemaine; libelle: string }> =
  ([1, 2, 3, 4, 5, 6, 0] as JourSemaine[]).map(valeur => ({
    valeur,
    libelle: LIBELLES_JOUR_SEMAINE[valeur],
  }));

/** Même liste, nommée par son usage historique — options du `<select>` « Jour de repos ». */
export const OPTIONS_JOUR_REPOS = OPTIONS_JOUR_SEMAINE;

/**
 * Semaine ouvrée → indices `getDay()`.
 *
 * ⚠ **Point unique de vérité, déplacé ici depuis `calendrier-planning.component.ts`** où il
 * était privé : le récapitulatif mensuel et le pointage vont poser la même question, et une
 * deuxième copie divergerait au premier ajustement — travers déjà signalé plus haut à propos
 * des libellés.
 */
const JOURS_PAR_SEMAINE: Record<JoursTravail, readonly JourSemaine[]> = {
  LUN_VEN: [1, 2, 3, 4, 5],
  LUN_SAM: [1, 2, 3, 4, 5, 6],
  LUN_DIM: [0, 1, 2, 3, 4, 5, 6],
  // ⚠ `PERSONNALISE` sans liste renseignée ⇒ **aucun filtrage**, et non « aucun jour ».
  // Miroir de l'échelon permissif du serveur : ne rien savoir du rythme ne doit pas faire
  // disparaître les créneaux, ce qui masquerait une absence réelle.
  PERSONNALISE: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * Le jour de repos ne s'applique qu'aux rythmes couvrant **plus de cinq jours**.
 *
 * En `LUN_VEN` la semaine ouvrée porte déjà ses deux jours de repos : y retirer un jour de
 * plus donnerait une semaine de quatre jours, ce que personne n'a demandé. Le formulaire
 * masque donc le champ dans ce cas, et cette garde le rend inopérant même si une valeur
 * traîne en base sur un dossier dont le rythme a changé après coup.
 *
 * ⚠ Sans objet également en `PERSONNALISE` : la liste des jours cochés est déjà la vérité
 * complète, et un jour de repos permettrait d'en retirer un qu'on vient de cocher.
 */
export function jourReposApplicable(joursTravail: JoursTravail | null | undefined): boolean {
  const rythme = joursTravail ?? 'LUN_VEN';
  return rythme !== 'LUN_VEN' && rythme !== 'PERSONNALISE';
}

/**
 * Jours travaillés explicites exploitables d'une affectation, normalisés.
 *
 * Le 7 ISO est ramené à 0 (dimanche) et les doublons sont retirés, comme le fait le serveur ;
 * les valeurs hors 0..6 sont **écartées** plutôt que refusées — le modèle est un lecteur, la
 * validation vit dans le formulaire et le service.
 *
 * ⚠ Une liste ne contenant **que** des valeurs inexploitables rend un tableau vide, donc
 * « pas de jours explicites » : `jourOuvreAffectation` retombe alors sur le rythme au lieu de
 * fermer la semaine entière. Même prudence que le rythme corrompu côté serveur.
 */
export function joursSemaineExplicites(
  a: Pick<AffectationSite, 'joursSemaine'>,
): JourSemaine[] {
  const vus = new Set<JourSemaine>();
  // ⚠ Lecture délibérément en `number` : le type annonce 0..6, mais le serveur tolère le 7
  // ISO pour dimanche et rien n'interdit une écriture directe en base. Se fier au type ici
  // laisserait passer la valeur telle quelle, donc un dimanche jamais reconnu.
  for (const brut of (a.joursSemaine ?? []) as readonly number[]) {
    if (brut == null) continue;
    const jour = (brut === 7 ? 0 : brut) as JourSemaine;
    if (jour >= 0 && jour <= 6) vus.add(jour);
  }
  return [...vus];
}

/**
 * « Lundi, Mercredi, Vendredi » — toujours dans l'ordre de la semaine, jamais dans celui de
 * la saisie, pour que deux affectations aux mêmes jours se lisent à l'identique.
 */
export function libelleJoursSemaine(jours: readonly JourSemaine[]): string {
  return OPTIONS_JOUR_SEMAINE
    .filter(o => jours.includes(o.valeur))
    .map(o => o.libelle)
    .join(', ');
}

/**
 * Cette affectation est-elle travaillée ce jour de la semaine ?
 *
 * Trois échelons, dans cet ordre : les **jours explicites** du site, puis sa semaine ouvrée,
 * puis son éventuel jour de repos hebdomadaire.
 *
 * ⚠ **Les jours explicites font seuls autorité** quand ils sont renseignés : ni le rythme,
 * ni le jour de repos ne s'y ajoutent. Miroir de l'échelon 0 de
 * `PlanningAffectationResolver.jourOuvre`.
 *
 * ⚠ **`jourRepos` absent ⇒ rien n'est retiré** : `LUN_SAM` conserve donc son repos
 * implicite du dimanche, et tout le parc existant garde exactement le comportement qu'il
 * avait avant l'introduction du champ.
 *
 * ⚠ **Miroir d'affichage.** L'autorité reste `PlanningAffectationResolver` côté serveur, y
 * compris son échelle de replis (jours explicites → site → employé → aucun filtrage) : ce
 * helper ne sert qu'à dessiner un calendrier, jamais à décider qu'un agent est absent.
 */
export function jourOuvreAffectation(
  a: Pick<AffectationSite, 'joursTravail' | 'jourRepos' | 'joursSemaine'>,
  jourSemaine: JourSemaine,
): boolean {
  const explicites = joursSemaineExplicites(a);
  if (explicites.length > 0) return explicites.includes(jourSemaine);

  const rythme = a.joursTravail ?? 'LUN_VEN';
  if (!JOURS_PAR_SEMAINE[rythme].includes(jourSemaine)) return false;
  if (!jourReposApplicable(rythme)) return true;
  return a.jourRepos == null || a.jourRepos !== jourSemaine;
}

/**
 * Libellé du repos hebdomadaire d'une affectation, tel qu'affiché à côté de la semaine
 * ouvrée. `null` quand le rythme ne s'y prête pas ou qu'aucun jour n'est saisi — l'appelant
 * n'affiche alors rien plutôt qu'un « Dimanche » deviné, qui serait faux pour Praline.
 */
export function libelleJourRepos(
  a: Pick<AffectationSite, 'joursTravail' | 'jourRepos' | 'joursSemaine'>,
): string | null {
  // Des jours explicites rendent le repos inopérant : l'annoncer serait faux.
  if (joursSemaineExplicites(a).length > 0) return null;
  if (!jourReposApplicable(a.joursTravail) || a.jourRepos == null) return null;
  return LIBELLES_JOUR_SEMAINE[a.jourRepos];
}

/**
 * Semaine ouvrée d'une affectation, jour de repos compris : « Lundi - Samedi (repos mardi) ».
 *
 * Avec des jours explicites, rend la liste elle-même : « Lundi, Mercredi, Vendredi ».
 * Sans jour de repos saisi, rend le libellé seul — c'est le cas de tout le parc, et
 * afficher « (repos dimanche) » partout serait un bruit inutile.
 */
export function libelleRythmeAffectation(
  a: Pick<AffectationSite, 'joursTravail' | 'jourRepos' | 'joursSemaine'>,
): string {
  const explicites = joursSemaineExplicites(a);
  if (explicites.length > 0) return libelleJoursSemaine(explicites);
  // `PERSONNALISE` sans liste exploitable : dire « Jours personnalisés » plutôt que
  // d'inventer une semaine dont on ne sait rien.
  const base = libelleJoursTravail(a.joursTravail);
  const repos = libelleJourRepos(a);
  return repos ? `${base} (repos ${repos.toLowerCase()})` : base;
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
  /**
   * Jour de repos hebdomadaire sur ce site, en indice `getDay()` (0 = dimanche).
   *
   * Ne vaut que pour les rythmes de plus de cinq jours. **Absent ⇒ rien n'est retiré** :
   * un agent en `LUN_SAM` se repose donc le dimanche, comme avant l'existence de ce champ.
   * Il n'est saisi que pour les sites qui dérogent à cette règle — un restaurant ouvert le
   * dimanche, dont les agents prennent leur repos un autre jour de la semaine.
   *
   * ⚠ Le jour de repos est **fixe par agent et par site**, il ne tourne pas d'une semaine à
   * l'autre. Un roulement demanderait un planning de repos hebdomadaire, qui rendrait ce
   * champ caduc plutôt que faux.
   */
  jourRepos?: JourSemaine | null;
  /**
   * Jours travaillés explicites sur ce site, en indices `getDay()` (0 = dimanche).
   *
   * ⚠ **Non vide ⇒ fait SEULE autorité** : ni `joursTravail` ni `jourRepos` ne s'y
   * appliquent, la liste EST la semaine ouvrée. C'est le cas de l'agent qui ne vient que le
   * lundi, le mercredi et le vendredi — rythme inexprimable par les trois préréglages, et
   * qui le faisait compter absent les quatre autres jours.
   *
   * ⚠ **Absent ou vide ⇒ comportement antérieur strictement inchangé** (semaine ouvrée puis
   * jour de repos) : tout le parc existant est donc neutre, sans migration.
   *
   * ⚠ Jours **fixes**, comme `jourRepos` : aucune rotation d'une semaine à l'autre. Un
   * roulement demanderait un planning hebdomadaire, qui rendrait ce champ caduc plutôt que
   * faux — ne pas s'en servir pour un agent en alternance.
   */
  joursSemaine?: JourSemaine[] | null;
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
export function aujourdHuiIso(): string {
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
