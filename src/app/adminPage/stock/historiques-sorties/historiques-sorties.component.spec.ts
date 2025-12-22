import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HistoriquesSortiesComponent } from './historiques-sorties.component';
import { StockService } from '../../../services/stock.service';
import { ToastrService } from 'ngx-toastr';
import {
  MouvementSortieStock,
  TypeMouvement,
  MotifMouvementSortieStock
} from '../../../models/MouvementSortieStock.model';

describe('HistoriquesSortiesComponent', () => {
  let component: HistoriquesSortiesComponent;
  let fixture: ComponentFixture<HistoriquesSortiesComponent>;
  let stockService: jasmine.SpyObj<StockService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const mockSorties: MouvementSortieStock[] = [
    {
      id: '1',
      codeProduit: 'P001',
      nomProduit: 'Savon',
      quantite: 2,
      typeMouvement: 'SORTIE' as TypeMouvement,
      destination: 'Agence Dakar',
      motifSortieStock: 'VENTE' as MotifMouvementSortieStock,
      responsable: 'Admin',
      mois: 'Janvier',
      dateMouvement: '2025-01-15' as any
    },
    {
      id: '2',
      codeProduit: 'P002',
      nomProduit: 'Détergent',
      quantite: 5,
      typeMouvement: 'SORTIE' as TypeMouvement,
      destination: 'Agence Thiès',
      motifSortieStock: 'INTERNE' as MotifMouvementSortieStock,
      responsable: 'Admin',
      mois: 'Février',
      dateMouvement: '2025-02-10' as any
    }
  ];

  beforeEach(async () => {
    stockService = jasmine.createSpyObj('StockService', ['getSorties']);
    toastr = jasmine.createSpyObj('ToastrService', ['error']);

    await TestBed.configureTestingModule({
      // ✅ Standalone component
      imports: [HistoriquesSortiesComponent],
      providers: [
        { provide: StockService, useValue: stockService },
        { provide: ToastrService, useValue: toastr }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriquesSortiesComponent);
    component = fixture.componentInstance;
  });

  // =====================================================
  // 1️⃣ Création
  // =====================================================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================================================
  // 2️⃣ ngOnInit → chargement des sorties
  // =====================================================
  it('should load sorties on init and convert dateMouvement to Date', () => {
    stockService.getSorties.and.returnValue(of(mockSorties));

    component.ngOnInit();

    expect(stockService.getSorties).toHaveBeenCalled();
    expect(component.sorties.length).toBe(2);
    expect(component.sorties[0].dateMouvement instanceof Date).toBeTrue();
  });

  // =====================================================
  // 3️⃣ Gestion d’erreur
  // =====================================================
  it('should show toastr error when loading sorties fails', () => {
    stockService.getSorties.and.returnValue(
      throwError(() => new Error('Erreur backend'))
    );

    component.loadSorties();

    expect(toastr.error).toHaveBeenCalledWith(
      'Erreur lors du chargement des sorties de stock',
      'Erreur'
    );
  });

  // =====================================================
  // 4️⃣ Filtrage par destination
  // =====================================================
  it('should filter sorties by destination', () => {
    component.sorties = mockSorties as any;
    component.searchText = 'dakar';

    const result = component.filteredSorties;

    expect(result.length).toBe(1);
    expect(result[0].destination).toContain('Dakar');
  });

  // =====================================================
  // 5️⃣ Filtrage par mois
  // =====================================================
  it('should filter sorties by month', () => {
    component.sorties = mockSorties as any;
    component.searchText = '';      // destination
    component.searchText2 = 'févr'; // mois

    const result = component.filteredSortiesByMonth;

    expect(result.length).toBe(1);
    expect(result[0].mois).toBe('Février');
  });

  // =====================================================
  // 6️⃣ Fermeture modale
  // =====================================================
  it('should close modal', () => {
    component.selectedProduit = mockSorties[0];

    component.closeModal();

    expect(component.selectedProduit).toBeNull();
  });
});
