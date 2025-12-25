import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgencesComponent } from './agences.component';
import { AgencesService } from '../../services/agences.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Agence } from '../../models/agences.model';
import { Employe } from '../../models/employe.model';

describe('AgencesComponent', () => {
  let component: AgencesComponent;
  let fixture: ComponentFixture<AgencesComponent>;

  let agencesSpy: jasmine.SpyObj<AgencesService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockAgence: Agence = {
    nom: 'Agence A',
    adresse: 'Dakar',
    joursOuverture: 'Lundi-Vendredi',
    heuresTravail: '06:00-15:00',
    nombreAgentsMaximum: 5,
    receptionEmploye: true,
    deplacementEmploye: false,
    deplacementInterne: false
  };

  const mockEmployes: Employe[] = [
    {
      codeSecret: 'EMP001',
      agentId: 'AGT001',
      nom: 'Diouf',
      prenom: 'Ousmane',
      numero: '770000000',
      intervention: 'Nettoyage',
      statut: 'ACTIF',
      employeCreePar: 'Admin',
      site: ['Agence A'],
      joursDeTravail: 'Lundi-Vendredi',
      deplacement: false,
      remplacement: false,
      heureDebut: '08:00',
      heureFin: '16:00',
      dateEtHeureCreation: '2024-01-01'
    }
  ];

  beforeEach(async () => {
    agencesSpy = jasmine.createSpyObj('AgencesService', [
      'getAgences',
      'createAgence',
      'updateAgence',
      'deleteAgence',
      'getEmployeesByAgence',
      'getEmployeeDeplacee',
      'getEmployeeRemplacee'
    ]);

    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    agencesSpy.getAgences.and.returnValue(of([mockAgence])); // Permet de tester le chargement initial
    agencesSpy.createAgence.and.returnValue(of(mockAgence)); // Permet de tester la création
    agencesSpy.updateAgence.and.returnValue(of(mockAgence)); // Permet de tester la mise à jour
    agencesSpy.deleteAgence.and.returnValue(of(undefined)); // Permet de tester la suppression
    agencesSpy.getEmployeesByAgence.and.returnValue(of(mockEmployes));
    agencesSpy.getEmployeeDeplacee.and.returnValue(of(mockEmployes[0]));
    agencesSpy.getEmployeeRemplacee.and.returnValue(of(mockEmployes[0]));

    await TestBed.configureTestingModule({
      imports: [AgencesComponent],
      providers: [
        { provide: AgencesService, useValue: agencesSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AgencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit
  });

  /* =========================
     BASIC
  ========================= */

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load agences on init', () => {
    expect(agencesSpy.getAgences).toHaveBeenCalled();
    expect(component.agences.length).toBe(1);
  });

  /* =========================
     MODALS
  ========================= */

  it('should open add modal', () => {
    component.openAddModal();

    expect(component.showModal).toBeTrue();
    expect(component.isEditMode).toBeFalse();
  });

  it('should open edit modal', () => {
    component.openEditModal(mockAgence);

    expect(component.showModal).toBeTrue();
    expect(component.isEditMode).toBeTrue();
    expect(component.selectedId).toBe('Agence A');
  });

  /* =========================
     SAVE
  ========================= */

  it('should show error if form invalid', () => {
    const form = { invalid: true, controls: {} } as NgForm;

    component.saveModal(form);

    expect(toastrSpy.error).toHaveBeenCalled();
    expect(agencesSpy.createAgence).not.toHaveBeenCalled();
  });

  it('should create agence when form valid and not edit mode', () => {
    component.isEditMode = false;

    const form = { invalid: false, controls: {} } as NgForm;

    component.saveModal(form);

    expect(agencesSpy.createAgence).toHaveBeenCalledWith(component.modalData);
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  it('should update agence when edit mode', () => {
    component.isEditMode = true;
    component.selectedId = 'Agence A';

    const form = { invalid: false, controls: {} } as NgForm;

    component.saveModal(form);

    expect(agencesSpy.updateAgence).toHaveBeenCalledWith('Agence A', component.modalData);
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  /* =========================
     FILTER
  ========================= */

  it('should filter agences by search text', () => {
    component.searchText = 'dakar';

    const result = component.filteredAgences;

    expect(result.length).toBe(1);
  });

  /* =========================
     DELETE
  ========================= */

  it('should delete agence after confirmation', () => {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);

    component.deleteAgence('Agence A');

    expect(agencesSpy.deleteAgence).toHaveBeenCalledWith('Agence A');
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  /* =========================
     VIEW EMPLOYEES
  ========================= */

  it('should load employees by agence and open modal', () => {
    component.viewEmployeesByAgence('Agence A');

    expect(agencesSpy.getEmployeesByAgence).toHaveBeenCalledWith('Agence A');
    expect(component.employesByAgence.length).toBe(1);
    expect(component.showModal2).toBeTrue();
  });

  it('should show error when loading employees by agence fails', () => {
    agencesSpy.getEmployeesByAgence.and.returnValue(
      throwError(() => ({}))
    );

    component.viewEmployeesByAgence('Agence A');

    expect(toastrSpy.error).toHaveBeenCalled();
  });
});
