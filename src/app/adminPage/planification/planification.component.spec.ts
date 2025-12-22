import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';

import { PlanificationComponent } from './planification.component';
import { PlanificationService } from '../../services/planification.service';
import { ToastrService } from 'ngx-toastr';
import { EmployeService } from '../../services/employe.service';
import { AgencesService } from '../../services/agences.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { LoginService } from '../../services/login.service';
import { Planification } from '../../models/planification.model';

describe('PlanificationComponent', () => {
  let component: PlanificationComponent;
  let fixture: ComponentFixture<PlanificationComponent>;

  let planificationService: jasmine.SpyObj<PlanificationService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let agenceService: jasmine.SpyObj<AgencesService>;
  let confirmDialogService: jasmine.SpyObj<ConfirmDialogService>;
  let loginService: jasmine.SpyObj<LoginService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const mockPlanification: Planification = {
    codeSecret: 'ABC123',
    prenomNom: 'John Doe',
    nomSite: 'Site A',
    siteDestination: ['Site B'],
    personneRemplacee: '',
    dateDebut: new Date('2025-08-10'),
    dateFin: new Date('2025-08-11'),
    matin: true,
    apresMidi: false,
    heureDebut: '08:00',
    heureFin: '16:00',
    statut: 'EN_ATTENTE',
    commentaires: '',
    motifAnnulation: null,
    dateCreation: new Date()
  };

  beforeEach(async () => {
    planificationService = jasmine.createSpyObj('PlanificationService', [
      'getPlanifications',
      'deletePlanification'
    ]);

    agenceService = jasmine.createSpyObj('AgencesService', ['getAllSites']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    confirmDialogService = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);
    loginService = jasmine.createSpyObj('LoginService', [
      'getFirstNameLastName',
      'getUserRole',
      'getUserPoste'
    ]);

    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    planificationService.getPlanifications.and.returnValue(of([mockPlanification]));
    planificationService.deletePlanification.and.returnValue(of(undefined));
    agenceService.getAllSites.and.returnValue(of(['Site A', 'Site B']));
    loginService.getFirstNameLastName.and.returnValue('Admin User');
    loginService.getUserRole.and.returnValue('SUPERADMIN');
    loginService.getUserPoste.and.returnValue('Manager');

    dialog.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);

    await TestBed.configureTestingModule({
      imports: [PlanificationComponent],
      providers: [
        { provide: PlanificationService, useValue: planificationService },
        { provide: ToastrService, useValue: toastr },
        { provide: EmployeService, useValue: {} },
        { provide: AgencesService, useValue: agenceService },
        { provide: ConfirmDialogService, useValue: confirmDialogService },
        { provide: LoginService, useValue: loginService },
        { provide: MatDialog, useValue: dialog },
        ChangeDetectorRef
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlanificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // =====================================================
  // 1️⃣ Création
  // =====================================================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================================================
  // 2️⃣ ngOnInit
  // =====================================================
  it('should load planifications and sites on init', () => {
    expect(planificationService.getPlanifications).toHaveBeenCalled();
    expect(agenceService.getAllSites).toHaveBeenCalled();
    expect(component.planifications.length).toBe(1);
    expect(component.availableSites.length).toBe(2);
  });

  // =====================================================
  // 3️⃣ readonlyIfStatusIsExecuted
  // =====================================================
  it('should return true if status is EXECUTEE or ANNULEE', () => {
    expect(component.readonlyIfStatusIsExecuted({ statut: 'EXECUTEE' } as any)).toBeTrue();
    expect(component.readonlyIfStatusIsExecuted({ statut: 'ANNULEE' } as any)).toBeTrue();
  });

  // =====================================================
  // 4️⃣ getStatusClass
  // =====================================================
  it('should return correct CSS class', () => {
    expect(component.getStatusClass('EN_ATTENTE')).toContain('yellow');
    expect(component.getStatusClass('EXECUTEE')).toContain('green');
  });

  // =====================================================
  // 5️⃣ openEditModal
  // =====================================================
  it('should open edit modal and set data', fakeAsync(() => {
    component.openEditModal(mockPlanification);
    tick(20);

    expect(component.isEditMode).toBeTrue();
    expect(component.selectedId).toBe('ABC123');
    expect(component.showModal).toBeTrue();
  }));

  // =====================================================
  // 6️⃣ deleteplanification
  // =====================================================
  it('should delete planification after confirmation', () => {
    component.deleteplanification('ABC123');

    expect(planificationService.deletePlanification).toHaveBeenCalledWith('ABC123');
    expect(toastr.success).toHaveBeenCalled();
  });

  // =====================================================
  // 7️⃣ Utils
  // =====================================================
  it('should calculate diff in hours', () => {
    const diff = component.diffInHours(
      '2025-08-10T00:00:00Z',
      '2025-08-11T00:00:00Z'
    );
    expect(diff).toBe(24);
  });

  it('should format date to dd/MM/yyyy', () => {
    const result = component.formatDateToDDMMYYYY('2025-08-10T00:00:00Z');
    expect(result).toBe('10/08/2025');
  });
});
