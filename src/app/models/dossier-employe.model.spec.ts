import { EnfantEmploye, ageAu, enfantsBeneficiairesAu, referenceExercice } from './dossier-employe.model';

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
});
