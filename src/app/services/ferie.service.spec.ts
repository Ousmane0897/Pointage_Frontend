import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FerieService } from './ferie.service';
import { Ferie } from '../models/ferie.model';
import { environment } from '../../environments/environment';

describe('FerieService', () => {
  let service: FerieService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrlEmploye;

  // ✅ Mock Ferie (adapte les champs si ton modèle en a plus)
  const ferieMock: Ferie = {
    date: '2025-01-01',
    nom: 'Jour de l’an'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FerieService]
    });

    service = TestBed.inject(FerieService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // 🔴 garantit qu’aucune requête HTTP n’est oubliée
  });

  // ===============================
  // 🟢 GET FERIES
  // ===============================
  it('doit récupérer la liste des jours fériés', () => {
    service.getFeries().subscribe((res: Ferie[]) => {
      expect(res.length).toBe(1);
      expect(res[0].nom).toBe('Jour de l’an');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/ferie`);
    expect(req.request.method).toBe('GET');

    req.flush([ferieMock]);
  });

  // ===============================
  // 🟢 POST FERIE
  // ===============================
  it('doit créer un jour férié', () => {
    service.postFerie(ferieMock).subscribe((res: Ferie) => {
      expect(res.date).toBe('2025-01-01');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/ferie`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(ferieMock);

    req.flush(ferieMock);
  });

  // ===============================
  // 🟢 UPDATE FERIE
  // ===============================
  it('doit mettre à jour un jour férié', () => {
    const updatedFerie: Ferie = {
      ...ferieMock,
      nom: 'Nouvel an'
    };

    service.updateFerie('2025-01-01', updatedFerie)
      .subscribe((res: Ferie) => {
        expect(res.nom).toBe('Nouvel an');
      });

    const req = httpMock.expectOne(`${baseUrl}/api/ferie/2025-01-01`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedFerie);

    req.flush(updatedFerie);
  });

  // ===============================
  // 🟢 DELETE FERIE
  // ===============================
  it('doit supprimer un jour férié', () => {
    service.deleteFerie('2025-01-01')
      .subscribe((res: void) => {
        expect(res).toBeNull();
      });

    const req = httpMock.expectOne(`${baseUrl}/api/ferie/2025-01-01`);
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });
});
