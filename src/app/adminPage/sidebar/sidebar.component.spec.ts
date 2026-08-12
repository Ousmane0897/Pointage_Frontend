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
    // forme héritée `rh: true` (accès RH total) — toujours supportée par accessRh()
    rh: true as unknown as ModulesAutorises['rh'],
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
  // 5️⃣ bis — Rubrique « Congés » (onglets Calendrier / Déclarations)
  // =====================================================
  describe('estRubriqueConges', () => {
    /** Le spy Router expose `url` en propriété : on la redéfinit pour varier la route. */
    const setUrl = (url: string) =>
      Object.defineProperty(router, 'url', { get: () => url, configurable: true });

    it('surligne la rubrique sur le calendrier', () => {
      setUrl('/admin/rh/temps-et-presences/conges');
      expect(component.estRubriqueConges()).toBeTrue();
    });

    it('surligne la rubrique sur les déclarations et leurs sous-routes', () => {
      setUrl('/admin/rh/temps-et-presences/absences');
      expect(component.estRubriqueConges()).toBeTrue();

      setUrl('/admin/rh/temps-et-presences/absences/nouvelle');
      expect(component.estRubriqueConges()).toBeTrue();
    });

    it('surligne la rubrique sur le formulaire et la fiche de demande', () => {
      setUrl('/admin/rh/temps-et-presences/conges/demande');
      expect(component.estRubriqueConges()).toBeTrue();

      setUrl('/admin/rh/temps-et-presences/conges/demandes/abc123');
      expect(component.estRubriqueConges()).toBeTrue();
    });

    it('ne surligne PAS la rubrique sur les entrées de menu restées distinctes', () => {
      setUrl('/admin/rh/temps-et-presences/conges/validation');
      expect(component.estRubriqueConges()).toBeFalse();

      setUrl('/admin/rh/temps-et-presences/conges/mes-demandes');
      expect(component.estRubriqueConges()).toBeFalse();
    });

    it('ignore les query params et le fragment', () => {
      setUrl('/admin/rh/temps-et-presences/conges?tab=1');
      expect(component.estRubriqueConges()).toBeTrue();
    });

    it('atterrit sur les déclarations quand le droit `conges` manque', () => {
      component.role = 'ADMIN';
      component.modulesAutorises = { rh: { absences: true } };
      expect(component.lienRubriqueConges()).toBe('/admin/rh/temps-et-presences/absences');

      component.modulesAutorises = { rh: { conges: true, absences: true } };
      expect(component.lienRubriqueConges()).toBe('/admin/rh/temps-et-presences/conges');
    });
  });

  // =====================================================
  // 5️⃣ ter — Rubrique « Bons » (onglets Entrée / Sortie)
  // =====================================================
  describe('estRubriqueBons', () => {
    const setUrl = (url: string) =>
      Object.defineProperty(router, 'url', { get: () => url, configurable: true });

    it('surligne la rubrique sur les deux racines', () => {
      setUrl('/admin/stock-v2/controle-mouvements/bons-entree');
      expect(component.estRubriqueBons()).toBeTrue();

      setUrl('/admin/stock-v2/controle-mouvements/bons-sortie');
      expect(component.estRubriqueBons()).toBeTrue();
    });

    it('surligne la rubrique sur les sous-routes (formulaire et fiche)', () => {
      setUrl('/admin/stock-v2/controle-mouvements/bons-entree/nouveau');
      expect(component.estRubriqueBons()).toBeTrue();

      setUrl('/admin/stock-v2/controle-mouvements/bons-sortie/BON123/modifier');
      expect(component.estRubriqueBons()).toBeTrue();
    });

    it('ne surligne PAS la rubrique sur les autres entrées du sous-menu', () => {
      setUrl('/admin/stock-v2/controle-mouvements/plafonds');
      expect(component.estRubriqueBons()).toBeFalse();

      setUrl('/admin/stock-v2/controle-mouvements/workflow');
      expect(component.estRubriqueBons()).toBeFalse();
    });

    it('ignore les query params et le fragment', () => {
      setUrl('/admin/stock-v2/controle-mouvements/bons-sortie?statut=SOUMIS');
      expect(component.estRubriqueBons()).toBeTrue();
    });

    it('atterrit sur les sorties quand le droit `bonsEntree` manque', () => {
      component.role = 'ADMIN';
      component.modulesAutorises = { stock: { bonsSortie: true } };
      expect(component.lienRubriqueBons()).toBe('/admin/stock-v2/controle-mouvements/bons-sortie');

      component.modulesAutorises = { stock: { bonsEntree: true, bonsSortie: true } };
      expect(component.lienRubriqueBons()).toBe('/admin/stock-v2/controle-mouvements/bons-entree');
    });
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

  it('should expose Industrie when a Production Chimie sub-flag is set', () => {
    expect(component.accessProductionChimie()).toBeTrue();
    expect(component.accessIndustrie()).toBeTrue();
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
