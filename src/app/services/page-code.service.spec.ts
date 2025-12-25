import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PageCodeService } from './page-code.service';
import { environment } from '../../environments/environment';
import { Pointage } from '../models/pointage.model';

describe('PageCodeService', () => {
  let service: PageCodeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PageCodeService]
    });

    service = TestBed.inject(PageCodeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Vérifie qu'aucune requête HTTP n'est en attente
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch pointage by codeSecret', () => {
    const mockPointage: Pointage = {
      codeSecret: 'ABC123',
      prenom: 'John',
      nom: 'Doe',
      date: '2025-01-01',
      heureArrive: '08:00',
      heureDepart: '17:00',
      duree: '9h',
      status: 'En cours',
      site: 'Agence A'
      // ajoute ici les autres propriétés si nécessaire
    };

    service.getPointageById('ABC123').subscribe((pointage) => {
      expect(pointage).toEqual(mockPointage);
    });

    const req = httpMock.expectOne(`${environment.apiUrlEmploye}/api/pointages/ABC123`);
    expect(req.request.method).toBe('GET');

    req.flush(mockPointage); // Simule la réponse du backend
  });
});
