import {
  calculerSynthese,
  LigneCalcul,
  MatiereActiveInfo,
} from './production-formulation-calcul';

/**
 * Miroir client du FormulationCalculServiceTest (backend). Jeu de référence
 * Détergent V5 : l'eau de complément exacte est 819 kg (1000 − 181), le CDC
 * annonçant 813 par erreur arithmétique (181 + 813 = 994 ≠ 1000).
 */
describe('calculerSynthese', () => {
  function mp(nom: string, maPct: number | null, compter: boolean): MatiereActiveInfo {
    return { nom, matiereActivePct: maPct, compterDansMa: compter };
  }

  function ligne(
    id: string,
    dosage: number | null,
    complement = false,
    qs = false,
  ): LigneCalcul {
    return { matierePremiereId: id, dosage, ingredientComplement: complement, qs };
  }

  function referenceMatieres(): Map<string, MatiereActiveInfo> {
    return new Map<string, MatiereActiveInfo>([
      ['SLES', mp('SLES', 70, true)],
      ['CAPB', mp('Bétaïne', 30, true)],
      ['LABSA', mp('LABSA', 96, true)],
      ['AOS', mp('AOS poudre', 92, true)],
      ['CMEA', mp('CMEA', 100, true)],
      ['GLUCO', mp('Gluconate', 100, false)],
      ['SEL', mp('Sel', 100, false)],
      ['PARFUM', mp('Parfum', null, false)],
      ['EAU', mp('Eau', null, false)],
    ]);
  }

  function referenceLignes(): LigneCalcul[] {
    return [
      ligne('SLES', 80),
      ligne('CAPB', 30),
      ligne('LABSA', 30),
      ligne('AOS', 8),
      ligne('CMEA', 10),
      ligne('GLUCO', 3),
      ligne('SEL', 16),
      ligne('PARFUM', 4),
      ligne('EAU', null, true),
    ];
  }

  it('jeu de référence Détergent V5', () => {
    const s = calculerSynthese(referenceLignes(), 1000, referenceMatieres());
    expect(s.maTotaleKg).toBeCloseTo(111.16, 5);
    expect(s.maPct).toBeCloseTo(11.116, 5);
    expect(s.eauQspKg).toBeCloseTo(819, 5);
    expect(s.totalSaisiKg).toBeCloseTo(1000, 5);
    expect(s.ecartTolerancePct).toBeCloseTo(0, 5);
    expect(s.totalConforme).toBeTrue();
    expect(s.nbLignesComplement).toBe(1);
    expect(s.warnings).toEqual([]);
  });

  it('ligne q.s. sans quantité est ignorée', () => {
    const lignes = [ligne('SLES', 80), ligne('SOUDE', null, false, true)];
    const matieres = new Map<string, MatiereActiveInfo>([
      ['SLES', mp('SLES', 70, true)],
      ['SOUDE', mp('Soude', 100, true)],
    ]);
    const s = calculerSynthese(lignes, 1000, matieres);
    expect(s.maTotaleKg).toBeCloseTo(56, 5);
    expect(s.totalSaisiKg).toBeCloseTo(80, 5);
    expect(s.warnings).toEqual([]);
  });

  it('aucune ligne qsp ne calcule pas l’eau', () => {
    const s = calculerSynthese([ligne('SLES', 80)], 1000, new Map([['SLES', mp('SLES', 70, true)]]));
    expect(s.eauQspKg).toBeNull();
    expect(s.nbLignesComplement).toBe(0);
    expect(s.totalConforme).toBeFalse();
  });

  it('deux lignes qsp sont signalées', () => {
    const lignes = [ligne('E1', null, true), ligne('E2', null, true)];
    const s = calculerSynthese(lignes, 1000, new Map());
    expect(s.nbLignesComplement).toBe(2);
    expect(s.eauQspKg).toBeNull();
    expect(s.warnings.some((w) => w.toLowerCase().includes('complément'))).toBeTrue();
  });

  it('somme des autres > lot → eau négative signalée, jamais affichée', () => {
    const lignes = [ligne('A', 700), ligne('B', 500), ligne('EAU', null, true)];
    const s = calculerSynthese(lignes, 1000, new Map());
    expect(s.eauQspKg).toBeNull();
    expect(s.warnings.some((w) => w.toLowerCase().includes('dépassent'))).toBeTrue();
  });

  it('taille de lot absente ou nulle', () => {
    const lignes = [ligne('SLES', 80)];
    const matieres = new Map([['SLES', mp('SLES', 70, true)]]);
    const sNull = calculerSynthese(lignes, null, matieres);
    expect(sNull.maPct).toBeNull();
    expect(sNull.ecartTolerancePct).toBeNull();
    expect(sNull.maTotaleKg).toBeCloseTo(56, 5);
    expect(calculerSynthese(lignes, 0, matieres).maPct).toBeNull();
  });

  it('MP comptée sans matière active est signalée et comptée 0', () => {
    const lignes = [ligne('SLES', 80), ligne('X', 20)];
    const matieres = new Map<string, MatiereActiveInfo>([
      ['SLES', mp('SLES', 70, true)],
      ['X', mp('Inconnue', null, true)],
    ]);
    const s = calculerSynthese(lignes, 1000, matieres);
    expect(s.maTotaleKg).toBeCloseTo(56, 5);
    expect(s.warnings.some((w) => w.includes('Inconnue'))).toBeTrue();
  });

  it('tolérance personnalisée bascule le verdict', () => {
    const lignes = [ligne('A', 999)];
    expect(calculerSynthese(lignes, 1000, new Map(), 0.1).totalConforme).toBeTrue();
    expect(calculerSynthese(lignes, 1000, new Map(), 0.05).totalConforme).toBeFalse();
  });
});
