/**
 * Barème des droits à congés — miroir du singleton serveur `parametres_conges`
 * (`GET/PUT /temps-presences/conges/parametres`).
 *
 * ⚠ Le serveur reste **l'autorité** : le front ne recalcule jamais un droit à partir
 * de ces valeurs, il ne s'en sert que pour *expliquer* les chiffres qu'il reçoit
 * (note de pied des blocs de solde, libellés de l'écran de paramétrage).
 */

/** « À partir de N années de service, +J jours de congé ». */
export interface PalierAncienneteConge {
  anneesAnciennete: number;
  joursSupplementaires: number;
}

export interface ParametresConges {
  id?: string;

  /** Jours ouvrables acquis par mois de service effectif. */
  joursAcquisParMois: number;

  supplementEnfantsActif: boolean;
  joursParEnfant: number;
  /** Âge limite **exclu** : « moins de 14 ans » ⇒ 14. */
  ageMaxEnfant: number;
  /** Réserve le supplément aux mères de famille. */
  reserverAuxMeres: boolean;
  /** Plafond de jours au titre des enfants. `null` ⇒ aucun plafond. */
  plafondJoursEnfants?: number | null;

  supplementAncienneteActif: boolean;
  /** ⚠ Paliers **non cumulatifs** : le plus élevé atteint gagne. */
  paliersAnciennete: PalierAncienneteConge[];

  /** Proratise les majorations sur les mois de service. Désactivé par défaut. */
  proratiserSupplements: boolean;

  dateModification?: string;
  modifieParId?: string;
  modifieParNom?: string;
}

/**
 * Barème légal sénégalais — **repli** quand le GET échoue (backend pas encore
 * déployé, 404), et valeurs du bouton « Rétablir le barème légal ».
 */
export const PARAMETRES_CONGES_DEFAUT: ParametresConges = {
  joursAcquisParMois: 2,
  supplementEnfantsActif: true,
  joursParEnfant: 1,
  ageMaxEnfant: 14,
  reserverAuxMeres: true,
  plafondJoursEnfants: null,
  supplementAncienneteActif: true,
  paliersAnciennete: [
    { anneesAnciennete: 10, joursSupplementaires: 1 },
    { anneesAnciennete: 15, joursSupplementaires: 2 },
    { anneesAnciennete: 20, joursSupplementaires: 3 },
    { anneesAnciennete: 25, joursSupplementaires: 6 },
  ],
  proratiserSupplements: false,
};

/**
 * Paliers triés par ancienneté croissante, pour l'affichage.
 * Le serveur trie déjà à l'enregistrement ; ceci couvre un document semé autrement.
 */
export function paliersTries(bareme: ParametresConges | null): PalierAncienneteConge[] {
  return [...(bareme?.paliersAnciennete ?? [])].sort(
    (a, b) => a.anneesAnciennete - b.anneesAnciennete,
  );
}
