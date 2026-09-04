import {
  AffectationSite,
  affectationAVenir,
  affectationTerminee,
  affectationsEnCours,
  affectationsTerminees,
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
