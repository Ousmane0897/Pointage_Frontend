import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { ProduitListComponent } from './produit-list.component';
import { ProduitService } from '../../../services/produit.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Produit } from '../../../models/produit.model';

describe('ProduitListComponent', () => {
  let component: ProduitListComponent;
  let fixture: ComponentFixture<ProduitListComponent>;

  let produitService: jasmine.SpyObj<ProduitService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let dialog: jasmine.SpyObj<MatDialog>;

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
    statut: 'DISPONIBLE',
    quantiteSnapshot: 10
  };

  beforeEach(async () => {
    produitService = jasmine.createSpyObj('ProduitService', [
      'getProduits',
      'deleteProduit',
      'filtrerProduitsByCategory',
      'filtrerProduitsByDestination'
    ]);

    toastr = jasmine.createSpyObj('ToastrService', [
      'success',
      'error'
    ]);

    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    produitService.getProduits.and.returnValue(
      of({ content: [mockProduit], total: 1 })
    );

    await TestBed.configureTestingModule({
      imports: [ProduitListComponent], // ✅ standalone
      providers: [
        { provide: ProduitService, useValue: produitService },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProduitListComponent);
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
  // 2️⃣ Chargement initial
  // =====================================================
  it('should load products on init', () => {
    expect(produitService.getProduits).toHaveBeenCalled();
    expect(component.produits.length).toBe(1);
    expect(component.total).toBe(1);
  });

  // =====================================================
  // 3️⃣ Recherche
  // =====================================================
  it('should emit search query', fakeAsync(() => {
    component.onSearchChange('savon');
    tick(500);

    expect(component.searchQuery).toBe('savon');
  }));

  // =====================================================
  // 4️⃣ Pagination
  // =====================================================
  it('should go to next page', () => {
    component.totalPages = 3;
    component.page = 0;

    component.nextPage();

    expect(component.page).toBe(1);
  });

  it('should go to previous page', () => {
    component.page = 2;

    component.prevPage();

    expect(component.page).toBe(1);
  });

  it('should go to specific page', () => {
    component.totalPages = 5;

    component.goToPage(3);

    expect(component.page).toBe(3);
  });

  // =====================================================
  // 5️⃣ Modales
  // =====================================================
  it('should open add modal', () => {
    component.openAddModal();

    expect(component.showModal).toBeTrue();
    expect(component.isEditMode).toBeFalse();
  });

  it('should open edit modal', () => {
    component.openEditModal(mockProduit);

    expect(component.showModal).toBeTrue();
    expect(component.isEditMode).toBeTrue();
    expect(component.selectedId).toBe('P001');
  });

  it('should open details modal', () => {
    component.ouvrirDetails(mockProduit);

    expect(component.showDetailsModal).toBeTrue();
    expect(component.produitSelectionne).toEqual(mockProduit);
  });

  // =====================================================
  // 6️⃣ Suppression avec confirmation
  // =====================================================
  it('should delete product after confirmation', () => {
    dialog.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);

    produitService.deleteProduit.and.returnValue(of(undefined));

    component.deleteRow('P001');

    expect(produitService.deleteProduit).toHaveBeenCalledWith('P001');
    expect(toastr.success).toHaveBeenCalled();
  });

  // =====================================================
  // 7️⃣ ngOnDestroy
  // =====================================================
  it('should complete destroy$', () => {
    const spy = spyOn(component['destroy$'], 'next').and.callThrough();

    component.ngOnDestroy();

    expect(spy).toHaveBeenCalled();
  });
});
