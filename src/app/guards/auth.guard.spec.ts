import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { LoginService } from '../services/login.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let loginService: jasmine.SpyObj<LoginService>;
  let router: jasmine.SpyObj<Router>;

  const mockRoute = {} as ActivatedRouteSnapshot;

  const createState = (url: string): RouterStateSnapshot =>
    ({ url } as RouterStateSnapshot);

  beforeEach(() => {
    const loginSpy = jasmine.createSpyObj('LoginService', [
      'isLoggedIn',
      'getMustChangePassword'
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: LoginService, useValue: loginSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    loginService = TestBed.inject(LoginService) as jasmine.SpyObj<LoginService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  // ======================================================
  // 1️⃣ ROUTES JAMAIS BLOQUÉES
  // ======================================================
  it('should allow access to /super-admin-login', () => {
    const state = createState('/super-admin-login');

    const result = guard.canActivate(mockRoute, state);

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access to /change-password', () => {
    const state = createState('/change-password');

    const result = guard.canActivate(mockRoute, state);

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // ======================================================
  // 2️⃣ UTILISATEUR NON CONNECTÉ
  // ======================================================
  it('should redirect to login if user is not logged in', () => {
    loginService.isLoggedIn.and.returnValue(false);
    loginService.getMustChangePassword.and.returnValue(false);

    const state = createState('/dashboard');

    const result = guard.canActivate(mockRoute, state);

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/super-admin-login']);
  });

  // ======================================================
  // 3️⃣ PREMIÈRE CONNEXION (CHANGEMENT MOT DE PASSE)
  // ======================================================
  it('should redirect to change-password if must change password', () => {
    loginService.isLoggedIn.and.returnValue(true);
    loginService.getMustChangePassword.and.returnValue(true);

    const state = createState('/dashboard');

    const result = guard.canActivate(mockRoute, state);

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/change-password']);
  });

  // ======================================================
  // 4️⃣ UTILISATEUR CONNECTÉ & OK
  // ======================================================
  it('should allow access if user is logged in and password is ok', () => {
    loginService.isLoggedIn.and.returnValue(true);
    loginService.getMustChangePassword.and.returnValue(false);

    const state = createState('/dashboard');

    const result = guard.canActivate(mockRoute, state);

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // ======================================================
  // 5️⃣ CAS LIMITE : change-password autorisé même si mustChangePassword = true
  // ======================================================
  it('should allow access to /change-password even if mustChangePassword is true', () => {
    loginService.isLoggedIn.and.returnValue(true);
    loginService.getMustChangePassword.and.returnValue(true);

    const state = createState('/change-password');

    const result = guard.canActivate(mockRoute, state);

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

});
