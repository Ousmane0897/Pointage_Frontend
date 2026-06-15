import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient
} from '@angular/common/http';

import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { AuthInterceptor } from './auth.interceptor';
import { LoginService } from './services/login.service';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loginServiceSpy: jasmine.SpyObj<LoginService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    loginServiceSpy = jasmine.createSpyObj('LoginService', [
      'getToken',
      'isTokenExpired',
      'logout'
    ]);
    // Par défaut le token n'est pas expiré : on laisse passer la requête.
    loginServiceSpy.isTokenExpired.and.returnValue(false);

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error', 'success', 'info']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: LoginService, useValue: loginServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastrService, useValue: toastrSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header when token exists and route is protected', () => {
    loginServiceSpy.getToken.and.returnValue('fake-jwt-token');

    http.get('/api/employes').subscribe();

    const req = httpMock.expectOne('/api/employes');

    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');

    req.flush({});
  });

  it('should NOT add Authorization header for login route', () => {
    loginServiceSpy.getToken.and.returnValue('fake-jwt-token');

    http.post('/api/login', {}).subscribe();

    const req = httpMock.expectOne('/api/login');

    expect(req.request.headers.has('Authorization')).toBeFalse();

    req.flush({});
  });

  it('should NOT add Authorization header for pointages route', () => {
    loginServiceSpy.getToken.and.returnValue('fake-jwt-token');

    http.get('/api/pointages').subscribe();

    const req = httpMock.expectOne('/api/pointages');

    expect(req.request.headers.has('Authorization')).toBeFalse();

    req.flush({});
  });

  it('should NOT add Authorization header when token is null', () => {
    loginServiceSpy.getToken.and.returnValue(null);

    http.get('/api/employes').subscribe();

    const req = httpMock.expectOne('/api/employes');

    expect(req.request.headers.has('Authorization')).toBeFalse();

    req.flush({});
  });

  it('should be created', () => {
    const interceptor = TestBed.inject(AuthInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
