import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { SidebarComponent } from './sidebar.component';
import { LoginService } from '../../services/login.service';
import { ModulesAutorises } from '../../models/admin.model';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let router: jasmine.SpyObj<Router>;
  let loginService: jasmine.SpyObj<LoginService>;

  const basePermissions: ModulesAutorises = {
    dashboard: true,
    admin: false,
    rh: true,
    productionChimie: {
      formulations: true,
      ordresFabrication: false,
      lots: false,
      controleQualite: false,
      matieresPremieres: false,
      conditionnement: false,
      tableauBord: false
    },
    terrain: {
      sitesClients: false,
      planning: false,
      pointage: false,
      alertes: false,
      interventions: false,
      controleQualite: false,
      materiel: false,
      phytosanitaire: false,
      tableauBord: false
    }
  };

  const permissions$ = new BehaviorSubject<ModulesAutorises>(basePermissions);

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigateByUrl'], {
      url: '/admin/exploitation-v2/dashboard'
    });

    loginService = jasmine.createSpyObj(
      'LoginService',
      ['getUserRole', 'getUserPermissions'],
      { permissions$ }
    );

    loginService.getUserRole.and.returnValue('ADMIN');
    loginService.getUserPermissions.and.returnValue(basePermissions);

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
    expect(component.modulesAutorises.dashboard).toBeTrue();
  });

  it('should update permissions when permissions$ emits', () => {
    permissions$.next({ ...basePermissions, dashboard: false, admin: true });

    expect(component.modulesAutorises.dashboard).toBeFalse();
    expect(component.modulesAutorises.admin).toBeTrue();
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
    expect(component.isActive('/admin/exploitation-v2/dashboard')).toBeTrue();
  });

  it('should return true if route starts with prefix', () => {
    expect(component.isActivePrefix('/admin')).toBeTrue();
  });

  // =====================================================
  // 6️⃣ Permissions
  // =====================================================
  it('should allow access if permission is true', () => {
    expect(component.hasPermission('dashboard')).toBeTrue();
  });

  it('should deny access if permission is false', () => {
    expect(component.hasPermission('admin')).toBeFalse();
  });

  it('should resolve nested access via hasAccess', () => {
    expect(component.hasAccess('productionChimie.formulations')).toBeTrue();
    expect(component.hasAccess('productionChimie.lots')).toBeFalse();
    expect(component.hasAccess('terrain.sitesClients')).toBeFalse();
  });

  it('should expose RH section when rh flag is set', () => {
    expect(component.accessRessourcesHumaines()).toBeTrue();
  });

  it('should expose Exploitation v2 when a Production Chimie sub-flag is set', () => {
    expect(component.accessProductionChimie()).toBeTrue();
    expect(component.accessExploitationV2()).toBeTrue();
  });

  it('should hide Terrain when no terrain sub-flag is set', () => {
    expect(component.accessTerrain()).toBeFalse();
  });

  // =====================================================
  // 7️⃣ Dropdowns
  // =====================================================
  it('should toggle the Ressources Humaines dropdown', () => {
    component.toggleDropdownRessourcesHumaines('rh');
    expect(component.openDropdownRessourcesHumaines).toBe('rh');

    component.toggleDropdownRessourcesHumaines('rh');
    expect(component.openDropdownRessourcesHumaines).toBeNull();
  });

  it('should toggle the Production Chimie dropdown', () => {
    component.toggleDropdownProductionChimie('pc');
    expect(component.openDropdownProductionChimie).toBe('pc');
  });

  it('should toggle the Terrain dropdown', () => {
    component.toggleDropdownTerrain('terrain');
    expect(component.openDropdownTerrain).toBe('terrain');
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
