import { formaterMinutes, minutesEnHeures } from './recapitulatif-mensuel.model';

describe('recapitulatif-mensuel.model', () => {
  describe('formaterMinutes', () => {
    it('formate heures et minutes sur deux chiffres', () => {
      expect(formaterMinutes(455)).toBe('7 h 35');
      expect(formaterMinutes(480)).toBe('8 h 00');
      expect(formaterMinutes(5)).toBe('0 h 05');
    });

    it('ne plafonne pas les heures (cumul mensuel)', () => {
      expect(formaterMinutes(9150)).toBe('152 h 30');
    });

    it('rend un tiret pour une valeur absente, jamais « 0 h 00 »', () => {
      expect(formaterMinutes(undefined)).toBe('—');
      expect(formaterMinutes(null)).toBe('—');
      expect(formaterMinutes(0)).toBe('0 h 00');
    });
  });

  describe('minutesEnHeures', () => {
    it('arrondit au centième pour la paie', () => {
      expect(minutesEnHeures(455)).toBe(7.58);
      expect(minutesEnHeures(9150)).toBe(152.5);
      expect(minutesEnHeures(undefined)).toBe(0);
    });
  });
});
