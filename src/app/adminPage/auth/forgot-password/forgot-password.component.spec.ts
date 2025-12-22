import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;

  let authSpy: jasmine.SpyObj<AuthService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['forgotPassword']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
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
     EMAIL EMPTY
  ========================= */

  it('should not call service if email is empty', () => {
    component.email = '';

    component.submit();

    expect(authSpy.forgotPassword).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  /* =========================
     SUCCESS
  ========================= */

  it('should call forgotPassword, show success and navigate on success', () => {
    component.email = 'test@email.com';

    authSpy.forgotPassword.and.returnValue(
      of({ message: 'Email envoyé avec succès' })
    );

    component.submit();

    expect(component.loading).toBeFalse();
    expect(authSpy.forgotPassword).toHaveBeenCalledWith('test@email.com');
    expect(toastrSpy.success).toHaveBeenCalledWith('Email envoyé avec succès');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/reset-password']);
  });

  /* =========================
     ERROR
  ========================= */

  it('should stop loading and show error on failure', () => {
    component.email = 'test@email.com';

    authSpy.forgotPassword.and.returnValue(
      throwError(() => ({ status: 404 }))
    );

    component.submit();

    expect(component.loading).toBeFalse();
    expect(toastrSpy.error).toHaveBeenCalledWith('Email introuvable');
  });

  /* =========================
     LOADING STATE
  ========================= */

  it('should set loading true before request and false after response', () => {
    component.email = 'test@email.com';

    authSpy.forgotPassword.and.returnValue(
      of({ message: 'OK' })
    );

    component.submit();

    expect(component.loading).toBeFalse(); // après succès
  });
});
