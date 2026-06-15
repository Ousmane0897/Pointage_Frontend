import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HomePageComponent } from './home-page.component';
import { LoginService } from '../services/login.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
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
        { provide: ToastrService, useValue: toastr }
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
