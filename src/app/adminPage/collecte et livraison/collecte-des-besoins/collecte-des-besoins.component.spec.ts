import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollecteDesBesoinsComponent } from './collecte-des-besoins.component';
import { BesoinsService } from '../../../services/besoins.service';
import { ProduitService } from '../../../services/produit.service';
import { AgencesService } from '../../../services/agences.service';
import { LoginService } from '../../../services/login.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Produit } from '../../../models/produit.model';
import { CollecteBesoins } from '../../../models/CollecteBesoins.model';

describe('CollecteDesBesoinsComponent', () => {
  let component: CollecteDesBesoinsComponent;
  let fixture: ComponentFixture<CollecteDesBesoinsComponent>;

  let besoinsSpy: jasmine.SpyObj<BesoinsService>;
  let produitSpy: jasmine.SpyObj<ProduitService>;
  let agencesSpy: jasmine.SpyObj<AgencesService>;
  let loginSpy: jasmine.SpyObj<LoginService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  const mockProduits: Produit[] = [
  {
    id: '1',
    codeProduit: 'P001',
    nomProduit: 'Savon',
    description: 'Savon liquide',
    categorie: 'Hygiène',
    destination: 'agence',
    uniteDeMesure: 'Litre',
    conditionnement: 'Bidon',
    prixDeVente: 1500,
    emplacement: 'Rayon A',
    seuilMinimum: 10,
    statut: 'DISPONIBLE',
    quantiteSnapshot: 50
  }
];

const mockCollecteBesoin: CollecteBesoins = {
  id: '1',
  destination: 'Agence A',
  responsable: 'Responsable A',
  statut: 'EN_ATTENTE',
  produitsDemandes: [
    {
      codeProduit: 'P001',
      nomProduit: 'Savon',
      quantite: 2
    }
  ],
  nombreModifications: 1,
  moisActuel: 'septembre'
};

  beforeEach(async () => {
    besoinsSpy = jasmine.createSpyObj('BesoinsService', [
      'createCollecteBesoins',
      'modifyStatutBesoins'
    ]);

    produitSpy = jasmine.createSpyObj('ProduitService', ['getAllProduits']);
    agencesSpy = jasmine.createSpyObj('AgencesService', ['getAllSites']);
    loginSpy = jasmine.createSpyObj('LoginService', [
      'getFirstNameLastName',
      'getUserRole',
      'getUserPoste'
    ]);

    toastrSpy = jasmine.createSpyObj('ToastrService', [
      'success',
      'error',
      'warning'
    ]);

    produitSpy.getAllProduits.and.returnValue(of(mockProduits));

    agencesSpy.getAllSites.and.returnValue(of(['Agence A', 'Agence B']));

    besoinsSpy.createCollecteBesoins.and.returnValue(of(mockCollecteBesoin));
    besoinsSpy.modifyStatutBesoins.and.returnValue(of(mockCollecteBesoin));

    loginSpy.getFirstNameLastName.and.returnValue('Ousmane Diouf');
    loginSpy.getUserRole.and.returnValue('EXPLOITATION');
    loginSpy.getUserPoste.and.returnValue('Responsable');

    await TestBed.configureTestingModule({
      imports: [CollecteDesBesoinsComponent],
      providers: [
        FormBuilder,
        { provide: BesoinsService, useValue: besoinsSpy },
        { provide: ProduitService, useValue: produitSpy },
        { provide: AgencesService, useValue: agencesSpy },
        { provide: LoginService, useValue: loginSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: ActivatedRoute, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CollecteDesBesoinsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit
  });

  // =========================
  // BASIC
  // =========================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with one product', () => {
    expect(component.form).toBeTruthy();
    expect(component.produits.length).toBe(1);
  });

  it('should load produits and agences', () => {
    expect(produitSpy.getAllProduits).toHaveBeenCalled();
    expect(agencesSpy.getAllSites).toHaveBeenCalled();
    expect(component.Lesproduits.length).toBe(1);
    expect(component.destinations.length).toBe(2);
  });

  // =========================
  // FORM ARRAY
  // =========================

  it('should add a product', () => {
    component.addProduit();
    expect(component.produits.length).toBe(2);
  });

  it('should remove product only if more than one', () => {
    component.addProduit();
    component.removeProduit(0);
    expect(component.produits.length).toBe(1);
  });

  // =========================
  // AUTO CODE PRODUIT
  // =========================

  it('should auto-fill codeProduit when nomProduit changes', () => {
    const fg = component.produits.at(0);
    fg.get('nomProduit')?.setValue('Savon');

    expect(fg.get('codeProduit')?.value).toBe('P001');
  });

  // =========================
  // SAVE
  // =========================

  it('should warn if form invalid on save', () => {
    component.form.reset();
    component.save();

    expect(toastrSpy.warning).toHaveBeenCalled();
    expect(besoinsSpy.createCollecteBesoins).not.toHaveBeenCalled();
  });

  it('should create collecte besoins when form valid', () => {
    component.form.patchValue({
      destination: 'Agence A',
      responsable: 'Responsable'
    });

    component.save();

    expect(besoinsSpy.createCollecteBesoins).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // =========================
  // STATUT
  // =========================

  it('should change statut if demandeId exists', () => {
    component.demandeId = '123';

    component.changerStatut('EN_COURS');

    expect(besoinsSpy.modifyStatutBesoins).toHaveBeenCalledWith('123', 'EN_COURS');
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // =========================
  // RESET
  // =========================

  it('should reset form properly', () => {
    component.form.patchValue({
      destination: 'Agence A',
      responsable: 'Resp'
    });

    component.resetForm();

    expect(component.produits.length).toBe(1);
    expect(component.form.get('statut')?.value).toBe('EN_ATTENTE');
  });
});
