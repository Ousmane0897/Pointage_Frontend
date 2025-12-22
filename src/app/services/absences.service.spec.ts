import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AbsencesService } from './absences.service';
import { environment } from '../../environments/environment';
import { Absent } from '../models/absent.model';

describe('AbsencesService', () => {
  let service: AbsencesService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrlEmploye;

  // ✅ Mock Absent conforme au modèle
  const mockAbsent: Absent = {
    codeSecret: 'EMP001',
    prenom: 'Ali',
    nom: 'Diop',
    numero: '770000000',
    dateAbsence: '2025-01-10',
    motif: 'maladie',
    justification: 'Certificat médical',
    intervention: 'Nettoyage',
    site: 'Agence Dakar'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AbsencesService]
    });

    service = TestBed.inject(AbsencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Vérifie qu’aucune requête HTTP n’est restée ouverte
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===================== UPDATE ABSENT =====================
  it('should update an absent by codeSecret', () => {
    service.updateAbsent('EMP001', mockAbsent).subscribe(result => {
      expect(result).toBeTruthy();
      expect(result.codeSecret).toBe('EMP001');
      expect(result.motif).toBe('maladie');
      expect(result.site).toBe('Agence Dakar');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/absences/EMP001`
    );

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockAbsent);

    req.flush(mockAbsent);
  });

  // ===================== ABSENCE TEMPS RÉEL =====================
  it('should get absences in real time', () => {
    service.AbsenceTempsReel().subscribe(result => {
      expect(result.length).toBe(1);
      expect(result[0].nom).toBe('Diop');
      expect(result[0].dateAbsence).toBe('2025-01-10');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/absences/temps-reel`
    );

    expect(req.request.method).toBe('GET');

    req.flush([mockAbsent]);
  });

  // ===================== ABSENCE HISTORIQUE =====================
  it('should get absence history', () => {
    service.AbsenceHistorique().subscribe(result => {
      expect(result.length).toBe(1);
      expect(result[0].justification).toBe('Certificat médical');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/absences`
    );

    expect(req.request.method).toBe('GET');

    req.flush([mockAbsent]);
  });

});
