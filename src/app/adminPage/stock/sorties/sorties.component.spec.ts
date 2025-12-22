import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { SortiesComponent } from './sorties.component';
import { StockService } from '../../../services/stock.service';
import { ProduitService } from '../../../services/produit.service';
import { AgencesService } from '../../../services/agences.service';
import { ToastrService } from 'ngx-toastr';
import { Produit } from '../../../models/produit.model';
import { TypeMouvement } from '../../../models/MouvementEntreeStock.model';
import { MotifMouvementSortieStock, MouvementSortieStock } from '../../../models/MouvementSortieStock.model';

describe('SortiesComponent', () => {
  let component: SortiesComponent;
  let fixture: ComponentFixture<SortiesComponent>;

  let stockService: jasmine.SpyObj<StockService>;
  let produitService: jasmine.SpyObj<ProduitService>;
  let agencesService: jasmine.SpyObj<AgencesService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const mockMouvementSortie: MouvementSortieStock = {
    id: 'MS-001',
    codeProduit: 'P001',
    nomProduit: 'Savon',
    quantite: 2,
    typeMouvement: 'SORTIE' as TypeMouvement,
    destination: 'Agence Dakar',
    motifSortieStock: 'VENTE' as MotifMouvementSortieStock,
    responsable: 'Admin',
    dateMouvement: new Date('2025-01-15')
  };

  const mockProduit: Produit = {
    codeProduit: 'P001',
    nomProduit: 'Savon',
    description: '',
    categorie: 'Hygiène',
    destination: 'VENTE',
    uniteDeMesure: 'Piece',
    conditionnement: 'Unité',
    prixDeVente: 1000,
    emplacement: 'A1',
    seuilMinimum: 5,
    statut: 'DISPONIBLE'
  };

  beforeEach(async () => {
    stockService = jasmine.createSpyObj('StockService', [
      'getStockProduit',
      'creerSortieSimple',
      'creerSortieBatch'
    ]);

    produitService = jasmine.createSpyObj('ProduitService', [
      'getProduits',
      'getAllProduits'
    ]);

    agencesService = jasmine.createSpyObj('AgencesService', [
      'getAllSites'
    ]);

    toastr = jasmine.createSpyObj('ToastrService', [
      'success',
      'error',
      'warning'
    ]);

    // 🔧 valeurs par défaut
    produitService.getProduits.and.returnValue(
      of({ content: [mockProduit] })
    );
    produitService.getAllProduits.and.returnValue(of([mockProduit]));
    agencesService.getAllSites.and.returnValue(of(['Agence Dakar']));
    stockService.getStockProduit.and.returnValue(of(20));
    stockService.creerSortieSimple.and.returnValue(of(mockMouvementSortie));

    await TestBed.configureTestingModule({
      imports: [SortiesComponent], // ✅ standalone
      providers: [
        FormBuilder,
        { provide: StockService, useValue: stockService },
        { provide: ProduitService, useValue: produitService },
        { provide: AgencesService, useValue: agencesService },
        { provide: ToastrService, useValue: toastr }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SortiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // déclenche ngOnInit
  });

  // =====================================================
  // 1️⃣ Création
  // =====================================================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================================================
  // 2️⃣ Initialisation
  // =====================================================
  it('should initialize form and load data', () => {
    expect(component.sortieForm).toBeTruthy();
    expect(component.produits.length).toBe(1);
    expect(component.agences.length).toBe(1);
    expect(component.produitsFormArray.length).toBe(1);
  });

  // =====================================================
  // 3️⃣ Getter FormArray
  // =====================================================
  it('should return produitsFormArray', () => {
    expect(component.produitsFormArray).toBeDefined();
    expect(component.produitsFormArray.length).toBeGreaterThan(0);
  });

  // =====================================================
  // 4️⃣ Ajouter produit
  // =====================================================
  it('should add a product line', () => {
    const initialLength = component.produitsFormArray.length;

    component.ajouterProduit();

    expect(component.produitsFormArray.length)
      .toBe(initialLength + 1);
  });

  // =====================================================
  // 5️⃣ Générer aperçu (form valide)
  // =====================================================
  it('should generate preview when form is valid', () => {
    const fg = component.produitsFormArray.at(0);

    fg.get('nomProduit')?.setValue('Savon');
    fg.get('codeProduit')?.setValue('P001');
    fg.get('quantite')?.setValue(2);

    component.sortieForm.patchValue({
      responsable: 'Admin',
      motifSortieStock: 'VENTE'
    });

    component.genererApercu();

    expect(component.apercuProduits.length).toBe(1);
    expect(component.apercuProduits[0].nomProduit).toBe('Savon');
  });

  // =====================================================
  // 6️⃣ Validation sortie simple
  // =====================================================
  it('should call creerSortieSimple when one product', () => {
    component.apercuProduits = [
      { codeProduit: 'P001', nomProduit: 'Savon', quantite: 2 }
    ];

    component.sortieForm.patchValue({
      responsable: 'Admin',
      motifSortieStock: 'VENTE'
    });

    component.validerSortie();

    expect(stockService.creerSortieSimple).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalled();
  });

  // =====================================================
  // 7️⃣ Validation sans aperçu
  // =====================================================
  it('should warn if no preview before validation', () => {
    component.apercuProduits = [];

    component.validerSortie();

    expect(toastr.warning)
      .toHaveBeenCalledWith('Veuillez d’abord générer un aperçu.');
  });

});
