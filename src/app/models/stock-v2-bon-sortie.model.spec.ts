import { siteSourceHorsReferentiel } from './stock-v2-bon-sortie.model';

describe('siteSourceHorsReferentiel', () => {
  it('est faux pour un site du référentiel', () => {
    expect(siteSourceHorsReferentiel({ siteSourceId: 's1', siteSourceNom: 'Dakar Plateau' })).toBeFalse();
  });

  it('est vrai pour un nom saisi sans site', () => {
    expect(siteSourceHorsReferentiel({ siteSourceNom: 'Chantier Diamniadio' })).toBeTrue();
  });

  it('est faux quand ni site ni nom ne sont renseignés', () => {
    expect(siteSourceHorsReferentiel({})).toBeFalse();
  });
});
