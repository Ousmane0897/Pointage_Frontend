import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrlEmploye;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Vérifie qu'aucune requête HTTP n'est restée en attente
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===================== FORGOT PASSWORD =====================
  it('should send forgot password request', () => {
    const email = 'user@test.com';
    const mockResponse = { message: 'Code envoyé par email' };

    service.forgotPassword(email).subscribe(response => {
      expect(response.message).toBe('Code envoyé par email');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/auth/forgot-password`
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email });

    req.flush(mockResponse);
  });

  // ===================== RESET PASSWORD =====================
  it('should reset password with code and new password', () => {
    const code = '123456';
    const newPassword = 'NewPassword@123';
    const mockResponse = { message: 'Mot de passe réinitialisé avec succès' };

    service.resetPassword(code, newPassword).subscribe(response => {
      expect(response.message).toBe('Mot de passe réinitialisé avec succès');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/auth/reset-password`
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      code,
      newPassword
    });

    req.flush(mockResponse);
  });

});
