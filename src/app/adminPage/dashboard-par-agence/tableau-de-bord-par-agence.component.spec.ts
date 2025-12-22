import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableauDeBordParAgenceComponent } from './tableau-de-bord-par-agence.component';
import { DashboardParAgenceService } from '../../services/dashboard-par-agence.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('TableauDeBordParAgenceComponent', () => {
  let component: TableauDeBordParAgenceComponent;
  let fixture: ComponentFixture<TableauDeBordParAgenceComponent>;

  let dashboardSpy: jasmine.SpyObj<DashboardParAgenceService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  const mockStats = {
    'Agence A': { total: 10, present: 8, absent: 2 },
    'Agence B': { total: 5, present: 4, absent: 1 }
  };

  beforeEach(async () => {
    dashboardSpy = jasmine.createSpyObj('DashboardParAgenceService', [
      'getDashboardData'
    ]);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error']);

    dashboardSpy.getDashboardData.and.returnValue(of(mockStats));

    await TestBed.configureTestingModule({
      imports: [TableauDeBordParAgenceComponent],
      providers: [
        { provide: DashboardParAgenceService, useValue: dashboardSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TableauDeBordParAgenceComponent);
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
    expect(dashboardSpy.getDashboardData).toHaveBeenCalled();
    expect(component.stats).toEqual(mockStats);
  });

  // =====================
  // ERROR
  // =====================

  it('should show toastr error if dashboard loading fails', () => {
    dashboardSpy.getDashboardData.and.returnValue(
      throwError(() => new Error('API error'))
    );

    component.loadData();

    expect(toastrSpy.error).toHaveBeenCalledWith(
      'Failed to load dashboard data',
      'Error'
    );
  });
});
