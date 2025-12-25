import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { SidebarComponent } from './sidebar.component';
import { LoginService } from '../../services/login.service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let router: jasmine.SpyObj<Router>;
  let loginService: jasmine.SpyObj<LoginService>;

  const permissions$ = new BehaviorSubject<any>({
    Dashboard: true,
    Employes: false
  });

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigateByUrl'], {
      url: '/admin/dashboard'
    });

    loginService = jasmine.createSpyObj(
      'LoginService',
      ['getUserRole', 'getUserPermissions'],
      { permissions$ }
    );

    loginService.getUserRole.and.returnValue('ADMIN');
    loginService.getUserPermissions.and.returnValue({
      Dashboard: true,
      Employes: false
    });

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: LoginService, useValue: loginService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
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
  // 2️⃣ ngOnInit
  // =====================================================
  it('should load role and permissions on init', () => {
    expect(component.role).toBe('ADMIN');
    expect(component.modulesAutorises.Dashboard).toBeTrue();
  });

  it('should update permissions when permissions$ emits', () => {
    permissions$.next({ Dashboard: false, Employes: true });

    expect(component.modulesAutorises.Dashboard).toBeFalse();
    expect(component.modulesAutorises.Employes).toBeTrue();
  });

  // =====================================================
  // 3️⃣ Responsive logic
  // =====================================================
  it('should close sidebar on tablet width', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(800);

    component.handleResize();

    expect(component.isOpen).toBeFalse();
  });

  it('should open sidebar on desktop width', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1200);

    component.handleResize();

    expect(component.isOpen).toBeTrue();
  });

  // =====================================================
  // 4️⃣ toggleSidebar
  // =====================================================
  it('should toggle sidebar', () => {
    const initial = component.isOpen;

    component.toggleSidebar();

    expect(component.isOpen).toBe(!initial);
  });

  // =====================================================
  // 5️⃣ Router helpers
  // =====================================================
  it('should return true if route is active', () => {
    expect(component.isActive('/admin/dashboard')).toBeTrue();
  });

  it('should return true if route starts with prefix', () => {
    expect(component.isActivePrefix('/admin')).toBeTrue();
  });

  // =====================================================
  // 6️⃣ Permissions
  // =====================================================
  it('should allow access if permission is true', () => {
    expect(component.hasPermission('Dashboard')).toBeTrue();
  });

  it('should deny access if permission is false', () => {
    expect(component.hasPermission('Employes')).toBeFalse();
  });

  // =====================================================
  // 7️⃣ Dropdowns
  // =====================================================
  it('should toggle dropdown menu', () => {
    component.toggleDropdown('stock');
    expect(component.openDropdown).toBe('stock');

    component.toggleDropdown('stock');
    expect(component.openDropdown).toBeNull();
  });

  it('should toggle employe dropdown', () => {
    component.toggleDropdownEmploye('emp');
    expect(component.openDropdownEmploye).toBe('emp');
  });

  it('should toggle collecte dropdown', () => {
    component.toggleDropdownCollecte('collecte');
    expect(component.openDropdownCollecte).toBe('collecte');
  });

  it('should toggle absent dropdown', () => {
    component.toggleDropdownAbsent('absent');
    expect(component.openDropdownAbsent).toBe('absent');
  });

  // =====================================================
  // 8️⃣ Logout
  // =====================================================
  it('should logout and navigate to root', () => {
    spyOn(localStorage, 'removeItem');

    component.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
export { SidebarComponent };

