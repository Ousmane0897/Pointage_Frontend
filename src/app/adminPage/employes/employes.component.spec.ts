import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployesComponent } from './employes.component';
import { EmployeService } from '../../services/employe.service';
import { LoginService } from '../../services/login.service';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

describe('EmployesComponent', () => {
  let component: EmployesComponent;
  let fixture: ComponentFixture<EmployesComponent>;
  let employeServiceSpy: jasmine.SpyObj<EmployeService>;
  let loginServiceSpy: jasmine.SpyObj<LoginService>;

  const mockEmployes = [
    {
      codeSecret: '001',
      agentId: 'A1',
      prenom: 'John',
      nom: 'Doe',
      numero: '123',
      intervention: 'IT',
      statut: 'Actif',
      employeCreePar: 'Admin',
      site: ['Dakar', 'Thies'],
      joursDeTravail: 'Lundi-Vendredi',
      deplacement: false,
      remplacement: false,
      heureDebut: '08:00',
      heureFin: '17:00',
      dateEtHeureCreation: '2025-12-27T08:00:00'
    },
    {
      codeSecret: '002',
      agentId: 'A2',
      prenom: 'Jane',
      nom: 'Smith',
      numero: '456',
      intervention: 'HR',
      statut: 'Actif',
      employeCreePar: 'Admin',
      site: ['Thies'],
      joursDeTravail: 'Lundi-Vendredi',
      deplacement: true,
      remplacement: false,
      heureDebut: '09:00',
      heureFin: '18:00',
      dateEtHeureCreation: '2025-12-27T09:00:00'
    }
  ];

  beforeEach(async () => {
    const employeSpy = jasmine.createSpyObj('EmployeService', ['getEmployes']);
    const loginSpy = jasmine.createSpyObj('LoginService', ['getFirstNameLastName']);

    await TestBed.configureTestingModule({
      declarations: [EmployesComponent],
      providers: [
        { provide: EmployeService, useValue: employeSpy },
        { provide: LoginService, useValue: loginSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployesComponent);
    component = fixture.componentInstance;
    employeServiceSpy = TestBed.inject(EmployeService) as jasmine.SpyObj<EmployeService>;
    loginServiceSpy = TestBed.inject(LoginService) as jasmine.SpyObj<LoginService>;

    employeServiceSpy.getEmployes.and.returnValue(of(mockEmployes));
    loginServiceSpy.getFirstNameLastName.and.returnValue('Admin Test');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load data on ngOnInit', () => {
    component.ngOnInit();
    expect(component.employes).toEqual(mockEmployes);
    expect(component.employeCreePar2).toBe('Admin Test');
  });

  it('should filter employes correctly with searchText matching nom', () => {
    component.employes = mockEmployes;
    component.searchText = 'Smith';
    const filtered = component.filteredEmployes;
    expect(filtered.length).toBe(1);
    expect(filtered[0].prenom).toBe('Jane');
  });

  it('should filter employes correctly with searchText matching site', () => {
    component.employes = mockEmployes;
    component.searchText = 'Thies';
    const filtered = component.filteredEmployes;
    expect(filtered.length).toBe(2); // John and Jane ont "Thies" dans site
  });

  it('should call XLSX writeFile on exportExcel', () => {
    spyOn(XLSX.utils, 'json_to_sheet').and.callThrough();
    spyOn(XLSX.utils, 'book_new').and.callThrough();
    spyOn(XLSX.utils, 'book_append_sheet').and.callThrough();
    spyOn(XLSX, 'writeFile').and.stub();

    component.employes$ = of(mockEmployes);
    component.exportExcel();

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(mockEmployes);
    expect(XLSX.writeFile).toHaveBeenCalledWith(jasmine.any(Object), 'employes.xlsx');
  });

  it('should call jsPDF save on exportPdf', () => {
    spyOn(jsPDF.prototype, 'save');
    component.employes$ = of(mockEmployes);
    component.exportPdf();

    expect(jsPDF.prototype.save).toHaveBeenCalled();
  });
});
