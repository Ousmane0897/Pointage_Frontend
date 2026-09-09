/**
 * Jour férié du calendrier de l'entreprise.
 *
 * Référentiel **saisi par la RH, année par année** : au Sénégal les fêtes musulmanes
 * (Korité, Tabaski, Tamkharit, Maouloud) sont mobiles et annoncées tardivement, aucune
 * règle de calcul ne peut les produire à l'avance. Le serveur fait autorité — le front
 * ne dérive jamais un férié, il ne fait que lire et écrire cette liste.
 */
export interface JourFerie {
  id?: string;
  /** `yyyy-MM-dd`. **Unique** — deux libellés ne peuvent pas se disputer le même jour. */
  date: string;
  libelle: string;
  /**
   * Jour **chômé** (l'entreprise ne travaille pas).
   *
   * ⚠ Dans les deux cas le jour **sort des jours ouvrables** : un férié n'est jamais dû,
   * et un agent qui ne vient pas n'est pas en absence. Ce drapeau est **informatif** — il
   * ne réintroduit jamais le jour dans les ouvrables.
   */
  chome?: boolean;
  /**
   * Férié à **date fixe**, reconductible d'une année sur l'autre (1er janvier, Fête du
   * Travail, Indépendance, Noël…). Les fêtes mobiles valent `false`.
   *
   * ⚠ Simple **aide à la saisie**, consommée par la duplication d'année : aucun calcul ne
   * le lit. Un férié « récurrent » non dupliqué n'existe pas pour l'année suivante.
   */
  recurrent?: boolean;

  dateModification?: string;
  modifieParId?: string;
  modifieParNom?: string;
}

/** Charge utile de création / modification — les métadonnées sont posées serveur. */
export type JourFeriePayload = Pick<JourFerie, 'date' | 'libelle' | 'chome' | 'recurrent'>;
