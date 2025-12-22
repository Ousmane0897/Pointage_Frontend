import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HistoriquesEntreesComponent } from './historiques-entrees.component';
import { StockService } from '../../../services/stock.service';
import { ToastrService } from 'ngx-toastr';
import { MotifMouvementEntreeStock, MouvementEntreeStock, TypeMouvement } from '../../../models/MouvementEntreeStock.model';

describe('HistoriquesEntreesComponent', () => {
  let component: HistoriquesEntreesComponent;
  let fixture: ComponentFixture<HistoriquesEntreesComponent>;
  let stockService: jasmine.SpyObj<StockService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const mockEntrees: MouvementEntreeStock[] = [
    {
      id: 'E1',
      codeProduit: 'P001',
      nomProduit: 'Savon',
      type: 'ENTREE' as TypeMouvement,
      quantite: 50,
      fournisseur: 'Fournisseur A',
      motifMouvement: 'RECEPTION_FOURNISSEUR' as MotifMouvementEntreeStock,
      dateMouvement: new Date('2025-01-10'),
      dateDePeremption: new Date('2025-06-10')
    },
    {
      id: 'E2',
      codeProduit: 'P002',
      nomProduit: 'Détergent',
      type: 'ENTREE' as TypeMouvement,
      quantite: 30,
      fournisseur: 'Fournisseur B',
      motifMouvement: 'RETOUR_EN_STOCK' as MotifMouvementEntreeStock,
      dateMouvement: null,
      dateDePeremption: null
    }
  ];

  beforeEach(async () => {
    stockService = jasmine.createSpyObj('StockService', ['getEntrees']);
    toastr = jasmine.createSpyObj('ToastrService', ['error']);

    await TestBed.configureTestingModule({
      // ✅ Composant standalone
      imports: [HistoriquesEntreesComponent],
      providers: [
        { provide: StockService, useValue: stockService },
        { provide: ToastrService, useValue: toastr }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriquesEntreesComponent);
    component = fixture.componentInstance;
  });

  // =====================================================
  // 1️⃣ Création
  // =====================================================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================================================
  // 2️⃣ ngOnInit → chargement des entrées
  // =====================================================
  it('should load entrees on init and convert dates to Date objects', () => {
    stockService.getEntrees.and.returnValue(of(mockEntrees));

    component.ngOnInit();

    expect(stockService.getEntrees).toHaveBeenCalled();
    expect(component.entrees.length).toBe(2);

    expect(component.entrees[0].dateMouvement instanceof Date).toBeTrue();
    expect(component.entrees[0].dateDePeremption instanceof Date).toBeTrue();

    expect(component.entrees[1].dateMouvement).toBeNull();
    expect(component.entrees[1].dateDePeremption).toBeNull();
  });

  // =====================================================
  // 3️⃣ Gestion d’erreur
  // =====================================================
  it('should show toastr error when loading entrees fails', () => {
    stockService.getEntrees.and.returnValue(
      throwError(() => new Error('Erreur backend'))
    );

    component.loadEntrees();

    expect(toastr.error).toHaveBeenCalledWith(
      'Erreur lors du chargement des entrées de stock',
      'Erreur'
    );
  });

  // =====================================================
  // 4️⃣ Ouverture / fermeture modale
  // =====================================================
  it('should open and close modal correctly', () => {
    component.openModal(mockEntrees[0]);
    expect(component.selectedProduit).toEqual(mockEntrees[0]);

    component.closeModal();
    expect(component.selectedProduit).toBeNull();
  });
});
