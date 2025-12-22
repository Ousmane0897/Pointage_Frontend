import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SuiviStockComponent } from './suivi-stock.component';
import { StockService } from '../../../services/stock.service';

describe('SuiviStockComponent', () => {
  let component: SuiviStockComponent;
  let fixture: ComponentFixture<SuiviStockComponent>;
  let stockService: jasmine.SpyObj<StockService>;

  const mockSuiviStock: Map<string, Object>[] = [
    new Map<string, Object>([
      ['produit', 'Savon'],
      ['etat', 'DISPONIBLE'],
      ['quantite', 100]
    ]),
    new Map<string, Object>([
      ['produit', 'Détergent'],
      ['etat', 'BAS'],
      ['quantite', 5]
    ]),
    new Map<string, Object>([
      ['produit', 'Gants'],
      ['etat', 'RUPTURE'],
      ['quantite', 0]
    ])
  ];


  beforeEach(async () => { 
    const stockSpy = jasmine.createSpyObj('StockService', [
      'getSuiviStock'
    ]);

    await TestBed.configureTestingModule({
      // ✅ Standalone component
      imports: [SuiviStockComponent],
      providers: [
        { provide: StockService, useValue: stockSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuiviStockComponent);
    component = fixture.componentInstance;

    stockService = TestBed.inject(
      StockService
    ) as jasmine.SpyObj<StockService>;
  });

  // =====================================================
  // 1️⃣ Création
  // =====================================================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================================================
  // 2️⃣ ngOnInit → succès
  // =====================================================
  it('should load suivi stock and stop loading on success', () => {
    stockService.getSuiviStock.and.returnValue(of(mockSuiviStock));

    component.ngOnInit();

    expect(stockService.getSuiviStock).toHaveBeenCalled();
    expect(component.suivi.length).toBe(3);
    expect(component.loading).toBeFalse();
  });

  // =====================================================
  // 3️⃣ ngOnInit → erreur
  // =====================================================
  it('should stop loading on error', () => {
    stockService.getSuiviStock.and.returnValue(
      throwError(() => new Error('Erreur serveur'))
    );

    component.ngOnInit();

    expect(component.loading).toBeFalse();
  });

  // =====================================================
  // 4️⃣ getEtatColor
  // =====================================================
  it('should return correct css class based on etat', () => {
    expect(component.getEtatColor('RUPTURE'))
      .toBe('bg-red-100 text-red-700');

    expect(component.getEtatColor('BAS'))
      .toBe('bg-yellow-100 text-yellow-700');

    expect(component.getEtatColor('DISPONIBLE'))
      .toBe('bg-green-100 text-green-700');

    expect(component.getEtatColor('AUTRE'))
      .toBe('bg-green-100 text-green-700');
  });
});
