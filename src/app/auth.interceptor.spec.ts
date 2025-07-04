import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';

import { AuthInterceptor } from './auth.interceptor';

import { LoginService } from './services/login.service';

describe('authInterceptor', () => {
  let interceptorInstance: AuthInterceptor;
  let loginService: LoginService;
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() =>
      interceptorInstance.intercept(req, { handle: next })
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoginService]
    });
    loginService = TestBed.inject(LoginService);
    interceptorInstance = new AuthInterceptor(loginService);
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});
