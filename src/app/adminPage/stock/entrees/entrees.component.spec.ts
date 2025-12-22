import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { EntreesComponent } from './entrees.component';
import { StockService } from '../../../services/stock.service';
import { ProduitService } from '../../../services/produit.service';
import { ToastrService } from 'ngx-toastr';
import { Produit } from '../../../models/produit.model';
import {
  MouvementEntreeStock,
  TypeMouvement,
  MotifMouvementEntreeStock
} from '../../../models/MouvementEntreeStock.model';

describe('EntreesComponent', () => {
  let component: EntreesComponent;
  let fixture: ComponentFixture<EntreesComponent>;
  let stockService: jasmine.SpyObj<StockService>;
  let produitService: jasmine.SpyObj<ProduitService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const mockProduits: Produit[] = [
    {
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
      statut: 'DISPONIBLE',
      quantiteSnapshot: 10
    }
  ];

  const mockEntree: MouvementEntreeStock = {
    codeProduit: 'P001',
    nomProduit: 'Savon',
    type: 'ENTREE' as TypeMouvement,
    quantite: 10,
    responsable: 'Admin',
    motifMouvement: 'RECEPTION_FOURNISSEUR' as MotifMouvementEntreeStock,
    fournisseur: 'Fournisseur A',
    numeroFacture: 'FAC-001',
    dateMouvement: new Date(),
    dateDePeremption: new Date()
  };

  beforeEach(async () => {
    stockService = jasmine.createSpyObj('StockService', ['ajouterEntree']);
    produitService = jasmine.createSpyObj('ProduitService', ['getAllProduits']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    produitService.getAllProduits.and.returnValue(of(mockProduits));
    stockService.ajouterEntree.and.returnValue(of(mockEntree));

    await TestBed.configureTestingModule({
      // ✅ Composant standalone
      imports: [EntreesComponent],
      providers: [
        { provide: StockService, useValue: stockService },
        { provide: ProduitService, useValue: produitService },
        { provide: ToastrService, useValue: toastr }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EntreesComponent);
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
  // 2️⃣ ngOnInit → chargement des produits
  // =====================================================
  it('should load produits on init', () => {
    expect(produitService.getAllProduits).toHaveBeenCalled();
    expect(component.produits.length).toBe(1);
    expect(component.produits[0].nomProduit).toBe('Savon');
  });

  // =====================================================
  // 3️⃣ onProduitChange
  // =====================================================
  it('should set codeProduit when produit changes', () => {
    component.produits = mockProduits;

    component.onProduitChange('Savon');

    expect(component.nouvelleEntree.codeProduit).toBe('P001');
  });

  // =====================================================
  // 4️⃣ ajouterEntree → succès
  // =====================================================
  it('should add entree and reset form on success', () => {
    component.nouvelleEntree = { ...mockEntree };

    component.ajouterEntree();

    expect(stockService.ajouterEntree).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalledWith(
      'Entrée de stock ajoutée avec succès',
      'Succès'
    );
    expect(component.nouvelleEntree.codeProduit).toBe('');
    expect(component.nouvelleEntree.quantite).toBe(0);
  });

  // =====================================================
  // 5️⃣ ajouterEntree → erreur
  // =====================================================
  it('should show error toastr if adding entree fails', () => {
    stockService.ajouterEntree.and.returnValue(
      throwError(() => new Error('Erreur backend'))
    );

    component.ajouterEntree();

    expect(toastr.error).toHaveBeenCalledWith(
      'Erreur lors de l\'ajout de l\'entrée de stock',
      'Erreur'
    );
  });

  // =====================================================
  // 6️⃣ Modale
  // =====================================================
  it('should open and close modal', () => {
    component.openModal(mockEntree);
    expect(component.selectedProduit).toEqual(mockEntree);

    component.closeModal();
    expect(component.selectedProduit).toBeNull();
  });
});
