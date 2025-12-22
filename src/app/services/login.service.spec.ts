import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginService } from './login.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';

describe('LoginService', () => {
  let service: LoginService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const baseUrl = environment.apiUrlEmploye;

  const fakePayload = {
    email: 'test@mail.com',
    role: 'ADMIN',
    poste: 'Manager',
    mustChangePassword: false,
    modules: { dashboard: true },
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const fakeToken =
    'header.' + btoa(JSON.stringify(fakePayload)) + '.signature';

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LoginService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(LoginService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
    localStorage.clear();
  });


  // ===============================
  // 🔹 AUTH API
  // ===============================

  it('doit appeler l’API login', () => {
    service.login('test@mail.com', '1234').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/api/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.body).toEqual({
      email: 'test@mail.com',
      password: '1234'
    });
  });

  it('doit appeler l’API change-password', () => {
    service.changePassword(
      'test@mail.com',
      'old',
      'new',
      'new',
      'ADMIN'
    ).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/api/login/change-password`);
    expect(req.request.method).toBe('POST');
  });

  // ===============================
  // 🔹 TOKEN
  // ===============================

  it('doit stocker le token', () => {
    service.setToken(fakeToken);
    expect(localStorage.getItem('token')).toBe(fakeToken);
  });

  it('doit récupérer le token', () => {
    localStorage.setItem('token', fakeToken);
    expect(service.getToken()).toBe(fakeToken);
  });

  it('doit décoder le token', () => {
    localStorage.setItem('token', fakeToken);
    const decoded = service.decodeToken();
    expect(decoded.email).toBe('test@mail.com');
  });

  it('doit retourner null si token absent', () => {
    expect(service.decodeToken()).toBeNull();
  });

  // ===============================
  // 🔹 USER INFOS
  // ===============================

  it('doit retourner email utilisateur', () => {
    localStorage.setItem('token', fakeToken);
    expect(service.getUserEmail()).toBe('test@mail.com');
  });

  it('doit retourner le rôle utilisateur', () => {
    localStorage.setItem('token', fakeToken);
    expect(service.getUserRole()).toBe('ADMIN');
  });

  it('doit retourner le poste utilisateur', () => {
    localStorage.setItem('token', fakeToken);
    expect(service.getUserPoste()).toBe('Manager');
  });

  it('doit retourner prénom + nom', () => {
    const token =
      'h.' +
      btoa(JSON.stringify({ prenom: 'Ousmane', nom: 'Diouf' })) +
      '.s';

    localStorage.setItem('token', token);
    expect(service.getFirstNameLastName()).toBe('Ousmane Diouf');
  });

  // ===============================
  // 🔹 MUST CHANGE PASSWORD
  // ===============================

  it('doit retourner true si mustChangePassword', () => {
    const token =
      'h.' +
      btoa(JSON.stringify({ mustChangePassword: true })) +
      '.s';

    localStorage.setItem('token', token);
    expect(service.getMustChangePassword()).toBeTrue();
  });

  // ===============================
  // 🔹 AUTH STATE
  // ===============================

  it('doit retourner true si utilisateur connecté', () => {
    localStorage.setItem('token', fakeToken);
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('doit retourner false si token expiré', () => {
    const expiredToken =
      'h.' +
      btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) - 10
      })) +
      '.s';

    localStorage.setItem('token', expiredToken);
    expect(service.isLoggedIn()).toBeFalse();
  });

  // ===============================
  // 🔹 PERMISSIONS
  // ===============================

  it('doit notifier les permissions', () => {
    localStorage.setItem('token', fakeToken);

    let permissions: any;
    service.permissions$.subscribe(p => (permissions = p));

    service.notifyPermissionsChanged();

    expect(permissions.dashboard).toBeTrue();
  });

  it('doit récupérer permissions depuis localStorage', () => {
    localStorage.setItem(
      'modulesAutorises',
      JSON.stringify({ admin: true })
    );

    const perms = service.getUserPermissions();
    expect(perms.admin).toBeTrue();
  });

  // ===============================
  // 🔹 LOGOUT
  // ===============================

  it('doit supprimer le token et rediriger vers /', () => {
    const router = TestBed.inject(Router);

    localStorage.setItem('token', fakeToken);
    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });




});
