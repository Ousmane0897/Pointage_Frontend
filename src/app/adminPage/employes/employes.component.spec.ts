import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EmployesComponent } from './employes.component';
import { EmployeService } from '../../services/employe.service';
import { AgencesService } from '../../services/agences.service';
import { LoginService } from '../../services/login.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { NgForm } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Employe } from '../../models/employe.model';

describe('EmployesComponent', () => {
  let component: EmployesComponent;
  let fixture: ComponentFixture<EmployesComponent>;

  let employeServiceSpy: jasmine.SpyObj<EmployeService>;
  let agenceServiceSpy: jasmine.SpyObj<AgencesService>;
  let loginServiceSpy: jasmine.SpyObj<LoginService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  const mockEmployes = [
    {
      codeSecret: 'EMP001',
      agentId: 'AGT001',
      nom: 'Diouf',
      prenom: 'Ousmane',
      numero: '770000000',
      intervention: 'Nettoyage',
      statut: 'Employé(e) simple',
      employeCreePar: 'Admin',
      site: ['Site A'],
      joursDeTravail: 'Lundi-Vendredi',
      deplacement: false,
      remplacement: false,
      heureDebut: '08:00',
      heureFin: '16:00',
      dateEtHeureCreation: '2024-01-01'
    }
  ];

  const mockEmploye: Employe = {
    codeSecret: 'EMP001',
    agentId: 'AGT001',
    nom: 'Diouf',
    prenom: 'Ousmane',
    numero: '770000000',
    intervention: 'Nettoyage',
    statut: 'Employé(e) simple',
    employeCreePar: 'Admin',
    site: ['Site A'],
    joursDeTravail: 'Lundi-Vendredi',
    deplacement: false,
    remplacement: false,
    heureDebut: '08:00',
    heureFin: '16:00',
    dateEtHeureCreation: '2024-01-01'
  };


  const mockAgence = {
    nom: 'Site A',
    heuresTravail: '07:00 - 18:00'
  };

  beforeEach(async () => {
    employeServiceSpy = jasmine.createSpyObj('EmployeService', [
      'getEmployes',
      'addEmploye',
      'updateEmploye',
      'deleteEmploye'
    ]);

    agenceServiceSpy = jasmine.createSpyObj('AgencesService', [
      'getAllSites',
      'getAgenceByNom',
      'getJoursOuverture',
      'getNumberofEmployeesInOneAgence',
      'MaxNumberOfEmployeesInOneAgence'
    ]);

    loginServiceSpy = jasmine.createSpyObj('LoginService', ['getFirstNameLastName']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    employeServiceSpy.getEmployes.and.returnValue(of(mockEmployes));
    employeServiceSpy.addEmploye.and.returnValue(of(mockEmploye));
    employeServiceSpy.updateEmploye.and.returnValue(of(mockEmploye));
    employeServiceSpy.deleteEmploye.and.returnValue(of(undefined));

    agenceServiceSpy.getAllSites.and.returnValue(of(['Site A', 'Site B']));
    agenceServiceSpy.getAgenceByNom.and.returnValue(of(mockAgence as any));
    agenceServiceSpy.getJoursOuverture.and.returnValue(of('Lundi-Vendredi'));
    agenceServiceSpy.getNumberofEmployeesInOneAgence.and.returnValue(of(1));
    agenceServiceSpy.MaxNumberOfEmployeesInOneAgence.and.returnValue(of(5));

    loginServiceSpy.getFirstNameLastName.and.returnValue('Admin User');

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);

    await TestBed.configureTestingModule({
      imports: [EmployesComponent],
      providers: [
        { provide: EmployeService, useValue: employeServiceSpy },
        { provide: AgencesService, useValue: agenceServiceSpy },
        { provide: LoginService, useValue: loginServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // =====================
  // BASIC
  // =====================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load employees on init', () => {
    expect(employeServiceSpy.getEmployes).toHaveBeenCalled();
    expect(component.employes.length).toBe(1);
  });

  it('should load available sites', () => {
    expect(agenceServiceSpy.getAllSites).toHaveBeenCalled();
    expect(component.availableSites.length).toBe(2);
  });

  // =====================
  // MODAL
  // =====================

  it('should open add modal', () => {
    component.openAddModal();
    expect(component.isEditMode).toBeFalse();
    expect(component.showModal).toBeTrue();
  });

  it('should open edit modal', () => {
    component.openEditModal(mockEmployes[0] as any);
    expect(component.isEditMode).toBeTrue();
    expect(component.selectedId).toBe('EMP001');
  });

  it('should close modal', () => {
    component.showModal = true;
    component.closeModal();
    expect(component.showModal).toBeFalse();
  });

  // =====================
  // SAVE
  // =====================

  it('should show error if form invalid', () => {
    const form = {
      invalid: true,
      controls: { nom: { markAsTouched: jasmine.createSpy() } }
    } as any as NgForm;

    component.saveModal(form);

    expect(toastrSpy.error).toHaveBeenCalled();
    expect(employeServiceSpy.addEmploye).not.toHaveBeenCalled();
  });

  it('should add employe when valid (1 site)', fakeAsync(() => {
    component.isEditMode = false;
    component.modalData.site = ['Site A'];
    component.modalData.heureDebut = '08:00';
    component.modalData.heureFin = '16:00';

    const form = { invalid: false, controls: {} } as NgForm;

    component.saveModal(form);
    tick();

    expect(employeServiceSpy.addEmploye).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  }));

  it('should update employe in edit mode', () => {
    component.isEditMode = true;
    component.selectedId = 'EMP001';

    component['updateEmploye']();

    expect(employeServiceSpy.updateEmploye).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // =====================
  // FILTER
  // =====================

  it('should filter employees', () => {
    component.employes = mockEmployes as any;
    component.searchText = 'ousmane';
    expect(component.filteredEmployes.length).toBe(1);
  });

  // =====================
  // DELETE
  // =====================

  it('should delete employee after confirmation', () => {
    component.deleteRow('EMP001');

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(employeServiceSpy.deleteEmploye).toHaveBeenCalledWith('EMP001');
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // =====================
  // EXPORT
  // =====================

  it('should export excel', () => {
    spyOn(XLSX.utils, 'json_to_sheet').and.callThrough();
    spyOn(XLSX, 'writeFile');

    component.employes$ = of(mockEmployes as any);
    component.exportExcel();

    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('should export pdf', () => {
    const saveSpy = spyOn(jsPDF.prototype, 'save');

    component.employes$ = of(mockEmployes as any);
    component.exportPdf();

    expect(saveSpy).toHaveBeenCalled();
  });
});
