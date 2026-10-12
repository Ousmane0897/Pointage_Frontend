import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PointageService } from './pointage.service';
import { environment } from '../../environments/environment';
import { Pointage, PointageResultat } from '../models/pointage.model';

describe('PointageService', () => {
  let service: PointageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // 1️⃣ Nettoyer localStorage avant tout
    localStorage.clear();

    // 2️⃣ Mock UUID AVANT la création du service
    spyOn(crypto, 'randomUUID').and.returnValue('123e4567-e89b-12d3-a456-426614174000');

    // 3️⃣ Configurer TestBed
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PointageService]
    });

    // 4️⃣ Injection du service et du HttpMock
    service = TestBed.inject(PointageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear(); // nettoyage pour les tests suivants
  });

  it('should create the service and set deviceId in localStorage', () => {
    const storedId = localStorage.getItem('device_id');
    expect(storedId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(service.getDeviceId()).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should return deviceId from localStorage', () => {
    localStorage.setItem('device_id', '123e4567-e89b-12d3-a456-426614174000');
    expect(service.getDeviceId()).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should send pointer data with POST', () => {
    const mockPointage: PointageResultat = {
      id: '1',
      codeSecret: 'ABC123',
      prenom: 'John',
      nom: 'Doe',
      date: '2025-12-25',
      heureArrive: '08:00',
      heureDepart: '17:00',
      adresse: 'Dakar',
      duree: '9h',
      status: 'Présent',
      site: ['Agence A'],
      type: 'SORTIE'
    };

    service.pointer({ codeSecret: 'ABC123' }).subscribe((res) => {
      expect(res).toEqual(mockPointage);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/pointages`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      codeSecret: 'ABC123',
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      latitude: undefined,
      longitude: undefined,
      precisionMetres: undefined,
      qrPayload: null
    });

    req.flush(mockPointage);
  });

  it('should relay the QR payload and the GPS precision', () => {
    service.pointer({
      codeSecret: '1234', deviceId: 'DEV', latitude: 14.7, longitude: -17.4,
      precisionMetres: 12, qrPayload: 'POINTIC:AG:abc'
    }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/pointages`);
    expect(req.request.body.qrPayload).toBe('POINTIC:AG:abc');
    expect(req.request.body.precisionMetres).toBe(12);
    req.flush({});
  });

  it('should resolve the agency name of a QR', () => {
    service.nomAgenceQr('POINTIC:AG:abc').subscribe((r) => expect(r.nom).toBe('SGS Mermoz'));

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/pointages/agence-qr` && r.params.get('payload') === 'POINTIC:AG:abc');
    expect(req.request.method).toBe('GET');
    req.flush({ nom: 'SGS Mermoz' });
  });

  it('should get pointages with GET', () => {
    const mockPointages: Pointage[] = [
      {
        id: '1',
        codeSecret: 'ABC123',
        prenom: 'John',
        nom: 'Doe',
        date: '2025-12-25',
        heureArrive: '08:00',
        adresse: 'Dakar',
        heureDepart: '17:00',
        duree: '9h',
        status: 'Présent',
        site: ['Agence A']
      },
      {
        id: '2',
        codeSecret: 'DEF456',
        prenom: 'Jane',
        nom: 'Doe',
        date: '2025-12-25',
        heureArrive: '09:00',
        heureDepart: '18:00',
        adresse: 'Dakar',
        duree: '9h',
        status: 'Présent',
        site: ['Agence B']
      }
    ];

    service.getPointages().subscribe((res) => {
      expect(res).toEqual(mockPointages);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/pointages`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPointages);
  });
});
