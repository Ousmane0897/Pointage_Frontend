import { TestBed } from '@angular/core/testing';
import { StockV2CumpService } from './stock-v2-cump.service';

describe('StockV2CumpService', () => {
  let service: StockV2CumpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockV2CumpService);
  });

  describe('calculerCump', () => {
    it('moyenne pondérée standard', () => {
      // 100 @ 1000 + 50 @ 1300 = (100000 + 65000) / 150 = 1100
      expect(service.calculerCump(100, 1000, 50, 1300)).toBe(1100);
    });

    it('stock initial nul → coût = prix d’achat', () => {
      expect(service.calculerCump(0, 0, 80, 1500)).toBe(1500);
    });

    it('quantité entrée nulle → coût inchangé', () => {
      expect(service.calculerCump(40, 900, 0, 9999)).toBe(900);
    });

    it('quantité entrée négative → coût inchangé', () => {
      expect(service.calculerCump(40, 900, -10, 9999)).toBe(900);
    });

    it('stock négatif traité comme 0 (robustesse)', () => {
      // base = 0 → coût = prix d’achat
      expect(service.calculerCump(-5, 1000, 10, 1200)).toBe(1200);
    });

    it('arrondi à l’entier (FCFA sans décimales)', () => {
      // (10×1000 + 3×1100)/13 = 13300/13 = 1023.07...
      expect(service.calculerCump(10, 1000, 3, 1100)).toBe(1023);
    });
  });

  describe('nouveauCoutDernierPrix', () => {
    it('renvoie le dernier prix', () => {
      expect(service.nouveauCoutDernierPrix(1450)).toBe(1450);
    });
    it('prix négatif borné à 0', () => {
      expect(service.nouveauCoutDernierPrix(-100)).toBe(0);
    });
  });

  describe('ecartCoutPct / estEcartAnormal', () => {
    it('écart de 20%', () => {
      expect(service.ecartCoutPct(1000, 1200)).toBeCloseTo(20, 5);
    });
    it('valeur absolue (baisse)', () => {
      expect(service.ecartCoutPct(1000, 800)).toBeCloseTo(20, 5);
    });
    it('ancien coût nul → 0', () => {
      expect(service.ecartCoutPct(0, 500)).toBe(0);
    });
    it('écart > 50% est anormal', () => {
      expect(service.estEcartAnormal(1000, 1600)).toBeTrue();
    });
    it('écart ≤ 50% n’est pas anormal', () => {
      expect(service.estEcartAnormal(1000, 1400)).toBeFalse();
    });
  });

  describe('valeur', () => {
    it('quantité × coût', () => {
      expect(service.valeur(12, 1500)).toBe(18000);
    });
    it('quantité négative bornée à 0', () => {
      expect(service.valeur(-3, 1500)).toBe(0);
    });
  });
});
