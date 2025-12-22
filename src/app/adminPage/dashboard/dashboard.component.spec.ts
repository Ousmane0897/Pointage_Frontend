import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../services/dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../../services/login.service';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  let dashboardServiceSpy: jasmine.SpyObj<DashboardService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let loginServiceSpy: jasmine.SpyObj<LoginService>;

  const mockStats = {
    total: 20,
    present: 15,
    absent: 5
  };

  beforeEach(async () => {
    dashboardServiceSpy = jasmine.createSpyObj('DashboardService', [
      'getDashboardData'
    ]);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error']);
    loginServiceSpy = jasmine.createSpyObj('LoginService', [
      'getFirstNameLastName',
      'getUserRole',
      'getUserPoste'
    ]);

    dashboardServiceSpy.getDashboardData.and.returnValue(of(mockStats));
    loginServiceSpy.getFirstNameLastName.and.returnValue('Ousmane Diouf');
    loginServiceSpy.getUserRole.and.returnValue('RESPONSABLE_IT');
    loginServiceSpy.getUserPoste.and.returnValue('Développeur');

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: LoginService, useValue: loginServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // déclenche ngOnInit
  });

  // =====================
  // BASIC
  // =====================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================
  // SUCCESS
  // =====================

  it('should load dashboard stats on init', () => {
    expect(dashboardServiceSpy.getDashboardData).toHaveBeenCalled();
    expect(component.stats).toEqual(mockStats);
  });

  it('should load user info from LoginService', () => {
    expect(component.prenomNom).toBe('Ousmane Diouf');
    expect(component.role).toBe('RESPONSABLE_IT');
    expect(component.poste).toBe('Développeur');
  });

  // =====================
  // ERROR
  // =====================

  it('should show toastr error if dashboard loading fails', () => {
    dashboardServiceSpy.getDashboardData.and.returnValue(
      throwError(() => new Error('API error'))
    );

    component.ngOnInit();

    expect(toastrSpy.error).toHaveBeenCalledWith(
      'Failed to load dashboard data',
      'Error'
    );
  });
});
