import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ChangementPasswordComponent } from './changement-password.component';
import { LoginService } from '../services/login.service';
import { ToastrService } from 'ngx-toastr';

describe('ChangementPasswordComponent', () => {
  let component: ChangementPasswordComponent;
  let fixture: ComponentFixture<ChangementPasswordComponent>;

  let loginService: jasmine.SpyObj<LoginService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const loginSpy = jasmine.createSpyObj('LoginService', [
      'getUserRole',
      'getUserPoste',
      'getUserEmail',
      'changePassword'
    ]);

    const toastrSpy = jasmine.createSpyObj('ToastrService', [
      'success',
      'error'
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      // ✅ Standalone component → imports
      imports: [ChangementPasswordComponent, FormsModule],
      providers: [
        { provide: LoginService, useValue: loginSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangementPasswordComponent);
    component = fixture.componentInstance;

    loginService = TestBed.inject(LoginService) as jasmine.SpyObj<LoginService>;
    toastr = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
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
  it('should initialize role and poste on init', () => {
    loginService.getUserRole.and.returnValue('ADMIN');
    loginService.getUserPoste.and.returnValue('Responsable');

    component.ngOnInit();

    expect(component.role).toBe('ADMIN');
    expect(component.poste).toBe('Responsable');
    expect(component.model.role).toBe('ADMIN');
  });

  // =====================================================
  // 3️⃣ Formulaire invalide
  // =====================================================
  it('should show error if form is invalid', () => {
    const fakeForm = { invalid: true } as NgForm;

    component.submit(fakeForm);

    expect(toastr.error).toHaveBeenCalledWith(
      'Veuillez remplir tous les champs correctement',
      'Erreur'
    );
  });

  // =====================================================
  // 4️⃣ Utilisateur non identifié
  // =====================================================
  it('should show error if user email is missing', () => {
    const fakeForm = { invalid: false } as NgForm;

    loginService.getUserEmail.and.returnValue(null);

    component.submit(fakeForm);

    expect(toastr.error).toHaveBeenCalledWith(
      'Utilisateur non identifié',
      'Erreur'
    );
  });

  // =====================================================
  // 5️⃣ Succès changement mot de passe
  // =====================================================
  it('should change password successfully and navigate', () => {
    const fakeForm = { invalid: false } as NgForm;

    loginService.getUserEmail.and.returnValue('admin@test.com');
    loginService.changePassword.and.returnValue(
      of({ message: 'Mot de passe changé', token: 'JWT_TOKEN' })
    );

    component.model.oldPassword = 'old';
    component.model.newPassword = 'new';
    component.model.confirmNewPassword = 'new';
    component.model.role = 'ADMIN';

    component.submit(fakeForm);

    expect(loginService.changePassword).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalledWith(
      'Mot de passe changé',
      'Succès'
    );
    expect(router.navigate).toHaveBeenCalledWith(['admin/dashboard']);
  });

  // =====================================================
  // 6️⃣ Erreur backend
  // =====================================================
  it('should show error message on backend error', () => {
    const fakeForm = { invalid: false } as NgForm;

    loginService.getUserEmail.and.returnValue('admin@test.com');
    loginService.changePassword.and.returnValue(
      throwError(() => ({
        error: { message: 'Ancien mot de passe incorrect' }
      }))
    );

    component.submit(fakeForm);

    expect(toastr.error).toHaveBeenCalledWith(
      'Ancien mot de passe incorrect',
      'Erreur'
    );
  });
});
