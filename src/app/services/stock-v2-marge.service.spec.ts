import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { StockV2MargeService } from './stock-v2-marge.service';

describe('StockV2MargeService', () => {
  let service: StockV2MargeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(StockV2MargeService);
  });

  describe('margeUnitaire', () => {
    it('prix − coût', () => {
      expect(service.margeUnitaire(1500, 1000)).toBe(500);
    });
    it('marge négative', () => {
      expect(service.margeUnitaire(800, 1000)).toBe(-200);
    });
  });

  describe('margeGlobale', () => {
    it('marge unitaire × quantité', () => {
      expect(service.margeGlobale(1500, 1000, 30)).toBe(15000);
    });
    it('quantité négative bornée à 0', () => {
      expect(service.margeGlobale(1500, 1000, -5)).toBe(0);
    });
  });

  describe('tauxMarge', () => {
    it('taux standard', () => {
      // (1500-1000)/1500 = 33.33%
      expect(service.tauxMarge(1500, 1000)).toBeCloseTo(33.333, 2);
    });
    it('prix de vente nul → 0', () => {
      expect(service.tauxMarge(0, 1000)).toBe(0);
    });
    it('taux négatif si vente à perte', () => {
      expect(service.tauxMarge(800, 1000)).toBeCloseTo(-25, 5);
    });
  });

  describe('estRentable', () => {
    it('rentable au-dessus du seuil (seuil 15%)', () => {
      // taux 33% > 15%
      expect(service.estRentable(1500, 1000)).toBeTrue();
    });
    it('non rentable si marge négative', () => {
      expect(service.estRentable(800, 1000)).toBeFalse();
    });
    it('non rentable si taux sous le seuil', () => {
      // (1050-1000)/1050 = 4.7% < 15%
      expect(service.estRentable(1050, 1000)).toBeFalse();
    });
    it('seuil personnalisé respecté', () => {
      // taux 4.7% ≥ seuil 4%
      expect(service.estRentable(1050, 1000, 4)).toBeTrue();
    });
  });
});
