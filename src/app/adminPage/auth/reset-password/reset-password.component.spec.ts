import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;

  let authSpy: jasmine.SpyObj<AuthService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /* =========================
     BASIC
  ========================= */

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /* =========================
     PASSWORD MISMATCH
  ========================= */

  it('should show error if passwords do not match', () => {
    component.code = 'ABC123';
    component.newPassword = 'password1';
    component.confirmPassword = 'password2';

    component.submit();

    expect(toastrSpy.error).toHaveBeenCalledWith('Les mots de passe ne correspondent pas');
    expect(authSpy.resetPassword).not.toHaveBeenCalled();
  });

  /* =========================
     SUCCESS
  ========================= */

  it('should reset password successfully and navigate', () => {
    component.code = 'ABC123';
    component.newPassword = 'password';
    component.confirmPassword = 'password';

    authSpy.resetPassword.and.returnValue(
      of({ message: 'Mot de passe réinitialisé avec succès' })
    );

    component.submit();

    expect(authSpy.resetPassword).toHaveBeenCalledWith('ABC123', 'password');
    expect(toastrSpy.success).toHaveBeenCalledWith('Mot de passe réinitialisé avec succès');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['']);
  });

  /* =========================
     ERROR BACKEND
  ========================= */

  it('should show error message when reset password fails', () => {
    component.code = 'ABC123';
    component.newPassword = 'password';
    component.confirmPassword = 'password';

    authSpy.resetPassword.and.returnValue(
      throwError(() => ({
        error: { message: 'Code invalide ou expiré' }
      }))
    );

    component.submit();

    expect(toastrSpy.error).toHaveBeenCalledWith('Code invalide ou expiré');
  });

  it('should show default error message if backend message is missing', () => {
    component.code = 'ABC123';
    component.newPassword = 'password';
    component.confirmPassword = 'password';

    authSpy.resetPassword.and.returnValue(
      throwError(() => ({}))
    );

    component.submit();

    expect(toastrSpy.error).toHaveBeenCalledWith(
      'Erreur lors de la réinitialisation du mot de passe'
    );
  });
});
