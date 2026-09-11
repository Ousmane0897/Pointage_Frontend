import {
  AffectationSite,
  EnfantEmploye,
  JourSemaine,
  affectationAVenir,
  affectationTerminee,
  affectationsEnCours,
  affectationsTerminees,
  ageAu,
  enfantsBeneficiairesAu,
  jourOuvreAffectation,
  jourReposApplicable,
  joursSemaineExplicites,
  libelleJourRepos,
  libelleJoursTravail,
  libelleRythmeAffectation,
  referenceExercice,
  splitSites,
} from './dossier-employe.model';

/**
 * Date de référence figée : sans elle, ces tests dépendraient du jour d'exécution —
 * le piège qui avait rendu l'ancienne suite du pointage centralisé inexploitable.
 */
const AUJOURD_HUI = '2026-09-04';

function affectation(p: Partial<AffectationSite>): AffectationSite {
  return { site: 'Yoff', dateEntree: '2026-01-01', joursTravail: 'LUN_VEN', ...p };
}

describe('splitSites', () => {
  it('éclate sur « / », « , » et « - » entouré d\'espaces', () => {
    expect(splitSites('Yoff / Ouakam')).toEqual(['Yoff', 'Ouakam']);
    expect(splitSites('Yoff, Ouakam')).toEqual(['Yoff', 'Ouakam']);
    expect(splitSites('Yoff - Ouakam')).toEqual(['Yoff', 'Ouakam']);
  });

  it('préserve les tirets internes aux noms de site', () => {
    expect(splitSites('Sacré-Coeur')).toEqual(['Sacré-Coeur']);
  });

  it('tolère une valeur absente ou vide', () => {
    expect(splitSites(null)).toEqual([]);
    expect(splitSites('   ')).toEqual([]);
  });
});

describe('affectationTerminee', () => {
  it('est vraie quand la sortie est passée', () => {
    expect(affectationTerminee(affectation({ dateSortie: '2026-08-31' }), AUJOURD_HUI)).toBeTrue();
  });

  it('est fausse sans date de sortie — l\'agent est toujours en poste', () => {
    expect(affectationTerminee(affectation({}), AUJOURD_HUI)).toBeFalse();
  });

  it('est fausse le jour même et pour une sortie future', () => {
    expect(affectationTerminee(affectation({ dateSortie: AUJOURD_HUI }), AUJOURD_HUI)).toBeFalse();
    expect(affectationTerminee(affectation({ dateSortie: '2026-12-31' }), AUJOURD_HUI)).toBeFalse();
  });

  it('absorbe un datetime renvoyé par le backend', () => {
    const a = affectation({ dateSortie: '2026-08-31T00:00:00.000+00:00' });
    expect(affectationTerminee(a, AUJOURD_HUI)).toBeTrue();
  });
});

describe('affectationAVenir', () => {
  it('distingue une prise de poste future d\'une prise de poste passée', () => {
    expect(affectationAVenir(affectation({ dateEntree: '2026-10-01' }), AUJOURD_HUI)).toBeTrue();
    expect(affectationAVenir(affectation({ dateEntree: '2026-01-01' }), AUJOURD_HUI)).toBeFalse();
  });

  it('est fausse sans date d\'entrée (dossier antérieur)', () => {
    expect(affectationAVenir(affectation({ dateEntree: null }), AUJOURD_HUI)).toBeFalse();
  });
});

describe('affectationsEnCours / affectationsTerminees', () => {
  const close = affectation({ site: 'Ouakam', dateEntree: '2025-01-01', dateSortie: '2025-06-30' });
  const active = affectation({ site: 'Yoff', dateEntree: '2025-07-01' });
  const aVenir = affectation({ site: 'Almadies', dateEntree: '2026-10-01' });
  const employe = { affectations: [close, active, aVenir] };

  it('range chaque affectation d\'un seul côté', () => {
    expect(affectationsEnCours(employe, AUJOURD_HUI).map(a => a.site)).toEqual(['Almadies', 'Yoff']);
    expect(affectationsTerminees(employe, AUJOURD_HUI).map(a => a.site)).toEqual(['Ouakam']);
  });

  it('trie les plus récentes en tête', () => {
    const dates = affectationsEnCours(employe, AUJOURD_HUI).map(a => a.dateEntree);
    expect(dates).toEqual(['2026-10-01', '2025-07-01']);
  });

  it('ne mute pas le tableau source', () => {
    const source = [close, active, aVenir];
    affectationsEnCours({ affectations: source }, AUJOURD_HUI);
    expect(source.map(a => a.site)).toEqual(['Ouakam', 'Yoff', 'Almadies']);
  });

  it('tolère un dossier sans affectations', () => {
    expect(affectationsEnCours(null, AUJOURD_HUI)).toEqual([]);
    expect(affectationsTerminees({ affectations: undefined }, AUJOURD_HUI)).toEqual([]);
  });
});

/**
 * Helpers d'affichage des enfants à charge.
 *
 * ⚠ Ils ne calculent **aucun droit** — le serveur reste l'autorité. Ils servent à montrer
 * à la RH ce que sa saisie produira, et c'est justement pour cela qu'ils doivent tomber
 * juste sur les bornes : un écart entre l'écran et le solde serait incompréhensible.
 *
 * Toutes les dates sont figées : la référence est le 31 décembre de l'exercice, pas
 * « aujourd'hui ».
 */
describe('helpers enfants — dossier-employe.model', () => {

  const enfant = (dateNaissance: string | null): EnfantEmploye =>
    ({ prenom: 'X', dateNaissance });

  describe('referenceExercice', () => {
    it('est le 31 décembre de l’exercice', () => {
      expect(referenceExercice(2026)).toBe('2026-12-31');
    });
  });

  describe('ageAu', () => {
    it('compte les années révolues', () => {
      expect(ageAu('2012-06-01', '2026-12-31')).toBe(14);
    });

    it('n’arrondit pas à la hausse : 13 ans et 364 jours restent 13 ans', () => {
      // Né le 1er janvier 2013, au 31/12/2026 : l'anniversaire des 14 ans est le lendemain.
      expect(ageAu('2013-01-01', '2026-12-31')).toBe(13);
    });

    it('bascule le jour anniversaire', () => {
      expect(ageAu('2012-12-31', '2026-12-31')).toBe(14);
      expect(ageAu('2013-01-01', '2027-01-01')).toBe(14);
    });

    it('renvoie null pour une date absente', () => {
      expect(ageAu(null, '2026-12-31')).toBeNull();
      expect(ageAu(undefined, '2026-12-31')).toBeNull();
    });

    it('renvoie null pour un enfant né après la date de référence', () => {
      expect(ageAu('2027-03-01', '2026-12-31')).toBeNull();
    });

    it('absorbe un datetime renvoyé par le backend', () => {
      expect(ageAu('2012-06-01T00:00:00Z', '2026-12-31')).toBe(14);
    });
  });

  describe('enfantsBeneficiairesAu', () => {
    const fratrie = [enfant('2012-06-01'), enfant('2015-06-01'), enfant('2020-06-01')];

    it('exclut l’enfant qui atteint l’âge limite (seuil strict)', () => {
      // Au 31/12/2026 : 14, 11 et 6 ans. Le seuil « moins de 14 ans » exclut l'aîné.
      expect(enfantsBeneficiairesAu(fratrie, 2026, 14).length).toBe(2);
    });

    it('rend un résultat différent sur un exercice antérieur', () => {
      // Au 31/12/2024 : 12, 9 et 4 ans — les trois ouvrent droit. C'est ce qui rend le
      // reliquat des exercices clos stable dans le temps.
      expect(enfantsBeneficiairesAu(fratrie, 2024, 14).length).toBe(3);
    });

    it('ignore un enfant né après la date de référence', () => {
      expect(enfantsBeneficiairesAu([enfant('2027-01-01')], 2026, 14).length).toBe(0);
    });

    it('ignore une date de naissance absente', () => {
      expect(enfantsBeneficiairesAu([enfant(null)], 2026, 14).length).toBe(0);
    });

    it('tolère une liste absente', () => {
      expect(enfantsBeneficiairesAu(null, 2026, 14)).toEqual([]);
      expect(enfantsBeneficiairesAu(undefined, 2026, 14)).toEqual([]);
    });

    it('suit l’âge limite paramétré', () => {
      expect(enfantsBeneficiairesAu(fratrie, 2026, 7).length).toBe(1);
      expect(enfantsBeneficiairesAu(fratrie, 2026, 18).length).toBe(3);
    });
  });

  describe('jour de repos hebdomadaire', () => {
    // Indices getDay() : 0 = dimanche, 1 = lundi … 6 = samedi.
    const DIMANCHE = 0, LUNDI = 1, MARDI = 2, SAMEDI = 6;

    it('ne s’applique pas au rythme Lundi - Vendredi', () => {
      // La semaine y porte déjà ses deux jours de repos : en retirer un troisième
      // donnerait une semaine de quatre jours.
      expect(jourReposApplicable('LUN_VEN')).toBeFalse();
      expect(jourReposApplicable('LUN_SAM')).toBeTrue();
      expect(jourReposApplicable('LUN_DIM')).toBeTrue();
    });

    it('sans jour de repos, le parc existant est inchangé', () => {
      const a = affectation({ joursTravail: 'LUN_SAM' });
      expect(jourOuvreAffectation(a, SAMEDI)).toBeTrue();
      expect(jourOuvreAffectation(a, DIMANCHE)).toBeFalse();
      expect(libelleJourRepos(a)).toBeNull();
    });

    it('retire le jour de repos saisi — le cas Praline', () => {
      // Restaurant ouvert le dimanche : l'agent travaille ce jour-là et se repose le mardi.
      const a = affectation({ joursTravail: 'LUN_DIM', jourRepos: MARDI });
      expect(jourOuvreAffectation(a, MARDI)).toBeFalse();
      expect(jourOuvreAffectation(a, DIMANCHE)).toBeTrue();
      expect(jourOuvreAffectation(a, LUNDI)).toBeTrue();
    });

    it('un jour hors semaine ouvrée reste fermé, jour de repos ou non', () => {
      const a = affectation({ joursTravail: 'LUN_SAM', jourRepos: MARDI });
      expect(jourOuvreAffectation(a, DIMANCHE)).toBeFalse();
      expect(jourOuvreAffectation(a, MARDI)).toBeFalse();
      expect(jourOuvreAffectation(a, SAMEDI)).toBeTrue();
    });

    it('ignore un jour de repos resté en base sur un rythme Lundi - Vendredi', () => {
      // Cas d'un rythme changé après coup : la garde évite une semaine de quatre jours.
      const a = affectation({ joursTravail: 'LUN_VEN', jourRepos: MARDI });
      expect(jourOuvreAffectation(a, MARDI)).toBeTrue();
      expect(libelleJourRepos(a)).toBeNull();
    });

    it('compose un libellé lisible', () => {
      expect(libelleRythmeAffectation(affectation({ joursTravail: 'LUN_SAM' })))
        .toBe('Lundi - Samedi');
      expect(libelleRythmeAffectation(affectation({ joursTravail: 'LUN_DIM', jourRepos: MARDI })))
        .toBe('Lundi - Dimanche (repos mardi)');
    });
  });

  describe('jours de travail explicites (rythme personnalisé)', () => {
    // Indices getDay() : 0 = dimanche, 1 = lundi … 6 = samedi.
    const DIMANCHE = 0, LUNDI = 1, MARDI = 2, MERCREDI = 3, JEUDI = 4, VENDREDI = 5, SAMEDI = 6;

    /** Affectation à jours explicites, marqueur compris. */
    function perso(joursSemaine: JourSemaine[] | null): AffectationSite {
      return affectation({ joursTravail: 'PERSONNALISE', joursSemaine });
    }

    it('le cas de l’agent trois jours par semaine', () => {
      // LE besoin : un rythme qu'aucun des trois préréglages n'exprime, et qui faisait
      // compter l'agent absent les quatre autres jours.
      const a = perso([LUNDI, MERCREDI, VENDREDI]);
      expect(jourOuvreAffectation(a, LUNDI)).toBeTrue();
      expect(jourOuvreAffectation(a, MERCREDI)).toBeTrue();
      expect(jourOuvreAffectation(a, VENDREDI)).toBeTrue();
      expect(jourOuvreAffectation(a, MARDI)).toBeFalse();
      expect(jourOuvreAffectation(a, JEUDI)).toBeFalse();
      expect(jourOuvreAffectation(a, SAMEDI)).toBeFalse();
      expect(jourOuvreAffectation(a, DIMANCHE)).toBeFalse();
    });

    it('les jours explicites priment sur le rythme préréglé', () => {
      const a = affectation({ joursTravail: 'LUN_VEN', joursSemaine: [DIMANCHE, SAMEDI] });
      expect(jourOuvreAffectation(a, SAMEDI)).toBeTrue();
      expect(jourOuvreAffectation(a, DIMANCHE)).toBeTrue();
      expect(jourOuvreAffectation(a, MARDI)).toBeFalse();
    });

    it('les jours explicites ignorent le jour de repos', () => {
      // La liste EST la semaine ouvrée : un repos retirerait un jour explicitement coché.
      const a = affectation({
        joursTravail: 'PERSONNALISE',
        jourRepos: MARDI,
        joursSemaine: [LUNDI, MARDI, MERCREDI],
      });
      expect(jourOuvreAffectation(a, MARDI)).toBeTrue();
      expect(libelleJourRepos(a)).toBeNull();
    });

    it('une liste vide ou absente laisse le comportement antérieur', () => {
      // ⚠ Vide ⇒ on retombe sur le rythme, jamais « aucun jour ouvré » : mettre les jours
      // ouvrables à zéro mettrait aussi les absences à zéro.
      const vide = affectation({ joursTravail: 'LUN_VEN', joursSemaine: [] });
      expect(jourOuvreAffectation(vide, VENDREDI)).toBeTrue();
      expect(jourOuvreAffectation(vide, SAMEDI)).toBeFalse();

      const absente = affectation({ joursTravail: 'LUN_SAM' });
      expect(jourOuvreAffectation(absente, SAMEDI)).toBeTrue();
      expect(jourOuvreAffectation(absente, DIMANCHE)).toBeFalse();
    });

    it('un rythme personnalisé sans jours ne filtre rien', () => {
      // Miroir de l'échelon permissif serveur : ne rien savoir du rythme ne doit pas faire
      // disparaître les créneaux, ce qui masquerait une absence réelle.
      const a = perso(null);
      expect(jourOuvreAffectation(a, SAMEDI)).toBeTrue();
      expect(jourOuvreAffectation(a, DIMANCHE)).toBeTrue();
    });

    it('tolère le 7 ISO et les doublons', () => {
      // Le type annonce 0..6, mais le serveur tolère le 7 : s'y fier laisserait passer un
      // dimanche jamais reconnu.
      expect(joursSemaineExplicites({ joursSemaine: [7, 1, 1] as unknown as JourSemaine[] }).sort())
        .toEqual([DIMANCHE, LUNDI]);
      expect(jourOuvreAffectation(perso([7] as unknown as JourSemaine[]), DIMANCHE)).toBeTrue();
    });

    it('écarte les valeurs hors intervalle et retombe sur le rythme', () => {
      // Une liste illisible est réputée absente : on ne ferme pas la semaine entière.
      expect(joursSemaineExplicites({ joursSemaine: [9] as unknown as JourSemaine[] })).toEqual([]);
      const a = affectation({ joursTravail: 'LUN_VEN', joursSemaine: [9] as unknown as JourSemaine[] });
      expect(jourOuvreAffectation(a, VENDREDI)).toBeTrue();
      expect(jourOuvreAffectation(a, SAMEDI)).toBeFalse();
    });

    it('le jour de repos ne s’applique pas au rythme personnalisé', () => {
      expect(jourReposApplicable('PERSONNALISE')).toBeFalse();
      expect(jourReposApplicable('LUN_SAM')).toBeTrue();
    });

    it('compose un libellé dans l’ordre de la semaine, pas de la saisie', () => {
      expect(libelleRythmeAffectation(perso([VENDREDI, LUNDI, MERCREDI])))
        .toBe('Lundi, Mercredi, Vendredi');
    });

    it('nomme le rythme personnalisé quand aucune liste n’est exploitable', () => {
      // Le repli `?? 'LUN_VEN'` de libelleJoursTravail ne doit pas avaler la valeur.
      expect(libelleJoursTravail('PERSONNALISE')).toBe('Jours personnalisés');
      expect(libelleRythmeAffectation(perso(null))).toBe('Jours personnalisés');
    });
  });
});
