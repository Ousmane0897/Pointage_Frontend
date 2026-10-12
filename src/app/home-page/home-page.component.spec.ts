import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HomePageComponent } from './home-page.component';
import { LoginService } from '../services/login.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PointageService } from '../services/pointage.service';
import { PointageQrContexteService } from '../services/pointage-qr-contexte.service';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  let loginService: jasmine.SpyObj<LoginService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: Router; // ✅ Router réel Angular

  beforeEach(async () => {
    loginService = jasmine.createSpyObj('LoginService', [
      'login',
      'setToken',
      'decodeToken',
      'notifyPermissionsChanged'
    ]);

    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [
        HomePageComponent,          // Standalone
        ReactiveFormsModule,
        NoopAnimationsModule,
        RouterTestingModule         // ✅ Fournit Router + ActivatedRoute
      ],
      providers: [
        { provide: LoginService, useValue: loginService },
        { provide: ToastrService, useValue: toastr },
        { provide: PointageService, useValue: jasmine.createSpyObj('PointageService', ['nomAgenceQr']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));

    fixture.detectChanges();
  });

  // ===============================
  // 🔹 TESTS GÉNÉRAUX
  // ===============================

  it('doit créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('formulaire invalide au chargement', () => {
    expect(component.contactForm.valid).toBeFalse();
  });

  // ===============================
  // 🔹 UI / STATE
  // ===============================

  it('togglePasswordVisibility inverse la visibilité du mot de passe', () => {
    component.showPassword = false;
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeTrue();
  });

  it('toggleForm affiche le formulaire', () => {
    component.showForm = false;
    component.toggleForm();
    expect(component.showForm).toBeTrue();
  });

  it('closeForm masque le formulaire', () => {
    component.showForm = true;
    component.closeForm();
    expect(component.showForm).toBeFalse();
  });

  // ===============================
  // 🔹 LOGIN - SUCCÈS (1ère connexion)
  // ===============================

  it('redirige vers change-password si mustChangePassword = true', fakeAsync(() => {
    loginService.login.and.returnValue(of({ token: 'fake-token' }));
    loginService.decodeToken.and.returnValue({
      mustChangePassword: true,
      modules: {}
    });

    component.contactForm.setValue({
      email: 'test@mail.com',
      password: '123456'
    });

    component.login();
    tick(200); // simule le passage du temps pour les opérations asynchrones

    expect(loginService.setToken).toHaveBeenCalledWith('fake-token');
    expect(toastr.info).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/change-password');


  }));

  // ===============================
  // 🔹 LOGIN - SUCCÈS (connexion normale)
  // ===============================

  it('redirige vers dashboard si login normal', fakeAsync(() => {
    loginService.login.and.returnValue(of({ token: 'fake-token' }));
    loginService.decodeToken.and.returnValue({
      mustChangePassword: false,
      modules: {}
    });

    component.contactForm.setValue({
      email: 'admin@test.com',
      password: '123456'
    });

    component.login();
    tick(200); // simule le passage du temps pour les opérations asynchrones

    expect(loginService.notifyPermissionsChanged).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/exploitation-v2/dashboard');


  }));

  // ===============================
  // 🔹 LOGIN - ERREUR
  // ===============================

  it('affiche une erreur toastr si login échoue', () => {
    loginService.login.and.returnValue(
      throwError(() => ({ error: { message: 'Erreur login' } }))
    );

    component.contactForm.setValue({
      email: 'test@mail.com',
      password: 'wrong'
    });

    component.login();

    expect(toastr.error).toHaveBeenCalledWith(
      'Erreur login',
      'Erreur de connexion'
    );
  });

  // ===============================
  // 🔹 NAVIGATION SECONDAIRE
  // ===============================

  it('redirige vers super-admin-login', () => {
    component.SuperAdminLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/super-admin-login');


  });

  it('redirige vers code-pin', () => {
    component.CodePinPage();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/code-pin');


  });
});

// ===============================
// 🔹 QR CODE D'AGENCE
// ===============================

describe("HomePageComponent — QR code d'agence", () => {
  let pointageService: jasmine.SpyObj<PointageService>;
  let qrContexte: PointageQrContexteService;

  async function creer(queryParams: Record<string, string>) {
    pointageService = jasmine.createSpyObj('PointageService', ['nomAgenceQr']);

    await TestBed.configureTestingModule({
      imports: [HomePageComponent, NoopAnimationsModule],
      providers: [
        { provide: LoginService, useValue: jasmine.createSpyObj('LoginService', ['login']) },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error', 'info']) },
        { provide: PointageService, useValue: pointageService },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    }).compileComponents();

    qrContexte = TestBed.inject(PointageQrContexteService);
    const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const fixture = TestBed.createComponent(HomePageComponent);
    return { fixture, component: fixture.componentInstance, routerSpy };
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("mémorise le QR de l'URL, le retire de l'URL et affiche l'agence", async () => {
    const { fixture, component, routerSpy } = await creer({ qr: 'POINTIC:AG:abc' });
    pointageService.nomAgenceQr.and.returnValue(of({ nom: 'SGS Mermoz' }));

    fixture.detectChanges();

    expect(qrContexte.payloadValide()).toBe('POINTIC:AG:abc');
    expect(routerSpy).toHaveBeenCalledWith([], jasmine.objectContaining({ replaceUrl: true }));
    expect(component.agenceQr).toBe('SGS Mermoz');
    expect(component.qrInvalide).toBeFalse();
  });

  it('signale un QR non reconnu par le serveur', async () => {
    const { fixture, component } = await creer({ qr: 'POINTIC:AG:inconnu' });
    pointageService.nomAgenceQr.and.returnValue(throwError(() => ({ status: 404 })));

    fixture.detectChanges();

    expect(component.agenceQr).toBeNull();
    expect(component.qrInvalide).toBeTrue();
  });

  it("sans QR, n'interroge pas le serveur", async () => {
    const { fixture, component } = await creer({});

    fixture.detectChanges();

    expect(pointageService.nomAgenceQr).not.toHaveBeenCalled();
    expect(component.agenceQr).toBeNull();
  });
});
