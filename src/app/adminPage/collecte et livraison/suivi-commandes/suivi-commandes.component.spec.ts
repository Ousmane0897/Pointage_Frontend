import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuiviCommandesComponent } from './suivi-commandes.component';
import { BesoinsService } from '../../../services/besoins.service';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../../../services/login.service';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CollecteBesoins } from '../../../models/CollecteBesoins.model';

describe('SuiviCommandesComponent', () => {
  let component: SuiviCommandesComponent;
  let fixture: ComponentFixture<SuiviCommandesComponent>;

  let besoinsSpy: jasmine.SpyObj<BesoinsService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let loginSpy: jasmine.SpyObj<LoginService>;

  const mockDemandes: CollecteBesoins[] = [
  {
    id: '1',
    destination: 'Agence A',
    responsable: 'Responsable A',
    statut: 'EN_ATTENTE',
    produitsDemandes: [
      {
        codeProduit: 'P1',
        nomProduit: 'Produit 1',
        quantite: 2
      }
    ],
    nombreModifications: 1,
    moisActuel: 'septembre'
  }
];

const mockDemande: CollecteBesoins = {
    id: '1',
    destination: 'Agence A',
    responsable: 'Responsable A',
    statut: 'EN_ATTENTE',
    produitsDemandes: [
      {
        codeProduit: 'P1',
        nomProduit: 'Produit 1',
        quantite: 2
      }
    ],
    nombreModifications: 1,
    moisActuel: 'septembre'
  };



  beforeEach(async () => {
    besoinsSpy = jasmine.createSpyObj('BesoinsService', [
      'getBesoinsByMoisActuel',
      'modifyCollecteBesoins',
      'getHistoriqueModifications',
      'modifyStatutBesoins'
    ]);

    toastrSpy = jasmine.createSpyObj('ToastrService', [
      'success',
      'error',
      'warning'
    ]);

    loginSpy = jasmine.createSpyObj('LoginService', [
      'getFirstNameLastName',
      'getUserRole',
      'getUserPoste'
    ]);

    besoinsSpy.getBesoinsByMoisActuel.and.returnValue(of(mockDemandes));
    besoinsSpy.modifyCollecteBesoins.and.returnValue(of(mockDemande));
    besoinsSpy.getHistoriqueModifications.and.returnValue(of(['Création']));
    besoinsSpy.modifyStatutBesoins.and.returnValue(of(mockDemande));

    loginSpy.getFirstNameLastName.and.returnValue('Ousmane Diouf');
    loginSpy.getUserRole.and.returnValue('BACKOFFICE');
    loginSpy.getUserPoste.and.returnValue('Gestionnaire');

    await TestBed.configureTestingModule({
      imports: [SuiviCommandesComponent],
      providers: [
        FormBuilder,
        { provide: BesoinsService, useValue: besoinsSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: LoginService, useValue: loginSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SuiviCommandesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit
  });

  // ======================
  // BASIC
  // ======================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load demandes on init', () => {
    expect(besoinsSpy.getBesoinsByMoisActuel).toHaveBeenCalled();
    expect(component.demandes.length).toBe(1);
  });

  // ======================
  // FORM
  // ======================

  it('should initialize edit form', () => {
    expect(component.editForm).toBeTruthy();
    expect(component.produits.length).toBe(0);
  });

  it('should add product to form array', () => {
    component.ajouterProduitDefault();
    expect(component.produits.length).toBe(1);
  });

  it('should remove product from form array', () => {
    component.ajouterProduitDefault();
    component.supprimerProduit(0);
    expect(component.produits.length).toBe(0);
  });

  // ======================
  // EDITION
  // ======================

  it('should open edit modal', () => {
    component.ouvrirEdition(mockDemandes[0] as any);

    expect(component.showEditModal).toBeTrue();
    expect(component.editingDemandeId).toBe('1');
    expect(component.produits.length).toBe(1);
  });

  it('should close modal', () => {
    component.fermerModal();
    expect(component.showEditModal).toBeFalse();
  });

  // ======================
  // GETTER
  // ======================

  it('should return false for aucuneCommandeDisponible when condition met', () => {
    component.role = 'BACKOFFICE';
    expect(component.aucuneCommandeDisponible).toBeFalse();
  });

  // ======================
  // SAVE
  // ======================

  it('should warn if form invalid on save', () => {
    component.editingDemandeId = '1';
    component.editForm.reset();

    component.sauvegarderEdition();

    expect(toastrSpy.warning).toHaveBeenCalled();
  });

  it('should save edited demande', () => {
    component.editingDemandeId = '1';
    component.editForm.patchValue({
      destination: 'Agence B',
      responsable: 'Resp'
    });

    component.sauvegarderEdition();

    expect(besoinsSpy.modifyCollecteBesoins).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // ======================
  // CSS LOGIC
  // ======================

  it('should apply disabled row class when not allowed', () => {
    component.role = 'BACKOFFICE';

    const classes = component.getRowClass({ nombreModifications: 0 });

    expect(classes['opacity-40 pointer-events-none']).toBeTrue();
  });

  // ======================
  // HISTORY
  // ======================

  it('should load modification history', () => {
    component.afficherHistorique(mockDemandes[0] as any);

    expect(besoinsSpy.getHistoriqueModifications).toHaveBeenCalled();
    expect(component.showHistoryModal).toBeTrue();
  });

  // ======================
  // STATUS
  // ======================

  it('should mark commande as EN_COURS', () => {
    component.mettreEnCours(mockDemandes[0] as any);

    expect(besoinsSpy.modifyStatutBesoins).toHaveBeenCalledWith(
      '1',
      'EN_COURS',
      jasmine.any(String)
    );
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  it('should mark commande as LIVREE', () => {
    component.marquerLivree(mockDemandes[0] as any);

    expect(besoinsSpy.modifyStatutBesoins).toHaveBeenCalledWith(
      '1',
      'LIVREE',
      jasmine.any(String)
    );
    expect(toastrSpy.success).toHaveBeenCalled();
  });

});
