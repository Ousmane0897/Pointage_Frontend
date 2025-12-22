import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionPrivilegeComponent } from './gestion-privilege.component';
import { AdminService } from '../../services/admin.service';
import { LoginService } from '../../services/login.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { NgForm } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('GestionPrivilegeComponent', () => {
  let component: GestionPrivilegeComponent;
  let fixture: ComponentFixture<GestionPrivilegeComponent>;

  let adminServiceSpy: jasmine.SpyObj<AdminService>;
  let loginServiceSpy: jasmine.SpyObj<LoginService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockAdmins  = [
    {
      id: '1',
      prenom: 'Ousmane',
      nom: 'Diouf',
      email: 'admin@test.com',
      password: '1234',
      poste: 'IT',
      role: 'RESPONSABLE_IT',
      modulesAutorises: {
        Dashboard: true,
        Admin: false,
        StatistiquesAgences: false,
        Planifications: false,
        Calendrier: false,
        Stock: false,
        CollecteLivraison: false,
        JourFeries: false,
        Employes: false,
        Agences: false,
        Absences: false,
        Pointages: false,
      },
      motifDesactivation: '',
      active: true,
    }
  ];

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminService', [
      'getAdmins',
      'createAdmin',
      'updateAdmin',
      'deleteAdmin'
    ]);

    loginServiceSpy = jasmine.createSpyObj('LoginService', ['logout']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    adminServiceSpy.getAdmins.and.returnValue(of(mockAdmins));
    adminServiceSpy.createAdmin.and.returnValue(of(mockAdmins[0]));
    adminServiceSpy.updateAdmin.and.returnValue(of(mockAdmins[0]));
    adminServiceSpy.deleteAdmin.and.returnValue(of(undefined));

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);

    await TestBed.configureTestingModule({
      imports: [GestionPrivilegeComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: LoginService, useValue: loginServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionPrivilegeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ======================
  // BASIC
  // ======================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load admins on init', () => {
    expect(adminServiceSpy.getAdmins).toHaveBeenCalled();
    expect(component.admins.length).toBe(1);
  });

  // ======================
  // MODAL
  // ======================

  it('should open add modal', () => {
    component.openAddModal();

    expect(component.isEditMode).toBeFalse();
    expect(component.showModal).toBeTrue();
    expect(component.selectedId).toBeNull();
  });

  it('should open edit modal', () => {
    component.openEditModal(mockAdmins[0] as any);

    expect(component.isEditMode).toBeTrue();
    expect(component.selectedId).toBe('1');
    expect(component.showModal).toBeTrue();
  });

  it('should close modal', () => {
    component.showModal = true;
    component.closeModal();
    expect(component.showModal).toBeFalse();
  });

  // ======================
  // SAVE
  // ======================

  it('should create admin when form is valid', () => {
    component.isEditMode = false;
    component.confirmPassword = '1234';
    component.modalData.password = '1234';

    const form = { invalid: false, controls: {} } as NgForm;

    component.saveModal(form);

    expect(adminServiceSpy.createAdmin).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  it('should update admin when edit mode', () => {
    component.isEditMode = true;
    component.selectedId = '1';
    component.confirmPassword = '1234';
    component.modalData.password = '1234';

    const form = { invalid: false, controls: {} } as NgForm;

    component.saveModal(form);

    expect(adminServiceSpy.updateAdmin).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // ======================
  // FILTER
  // ======================

  it('should filter admins by search text', () => {
    component.admins = mockAdmins as any;
    component.searchText = 'ousmane';

    expect(component.filteredAdmins.length).toBe(1);
  });

  // ======================
  // STATUS
  // ======================

  it('should toggle admin status', () => {
    component.toggleStatus(mockAdmins[0] as any);

    expect(adminServiceSpy.updateAdmin).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // ======================
  // DELETE
  // ======================

  it('should delete admin after confirmation', () => {
    component.deleteRow('1');

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(adminServiceSpy.deleteAdmin).toHaveBeenCalledWith('1');
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // ======================
  // AUTH
  // ======================

  it('should logout', () => {
    component.logout();
    expect(loginServiceSpy.logout).toHaveBeenCalled();
  });

  // ======================
  // UI
  // ======================

  it('should toggle password visibility', () => {
    component.showPassword = false;
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeTrue();
  });
});
