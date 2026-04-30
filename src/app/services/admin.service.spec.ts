import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AdminService } from './admin.service';
import { environment } from '../../environments/environment';
import { Admin } from '../models/admin.model';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrl;

  const mockAdmin: Admin = {
    id: '1',
    prenom: 'Ousmane',
    nom: 'Diouf',
    email: 'admin@test.com',
    password: 'password123',
    poste: 'Super Admin',
    role: 'SUPERADMIN',
    modulesAutorises: {
      dashboard: true,
      admin: true,
      statistiquesAgences: true,
      planifications: false,
      calendrier: true,
      jourFeries: true,
      employes: true,
      agences: true,
      ressourcesHumaines: {
        agentsRh: true,
        developpementRh: true,
      },
      collecteLivraison: {
        collecteBesoins: true,
        suiviLivraison: true,
      },
      absences: {
        tempsReel: false,
        historiqueAbsences: false,
      },
      pointages: {
        pointagesDuJour: true,
        historiquePointages: true,
      },
      stock: {
        produits: false,
        entrees: false,
        sorties: false,
        suivis: false,
        historiquesEntrees: false,
        historiquesSorties: false,
      },
    },
    active: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService]
    });

    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Vérifie qu’aucune requête HTTP n’est restée ouverte
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===================== GET ADMINS =====================
  it('should get all admins', () => {
    service.getAdmins().subscribe(admins => {
      expect(admins.length).toBe(1);
      expect(admins[0].email).toBe('admin@test.com');
      expect(admins[0].modulesAutorises.admin).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/superadmin`);
    expect(req.request.method).toBe('GET');

    req.flush([mockAdmin]);
  });

  // ===================== CREATE ADMIN =====================
  it('should create an admin', () => {
    service.createAdmin(mockAdmin).subscribe(admin => {
      expect(admin.nom).toBe('Diouf');
      expect(admin.active).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/superadmin`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockAdmin);

    req.flush(mockAdmin);
  });

  // ===================== UPDATE ADMIN =====================
  it('should update an admin', () => {
    service.updateAdmin('1', mockAdmin).subscribe(admin => {
      expect(admin.id).toBe('1');
      expect(admin.modulesAutorises.dashboard).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/superadmin/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockAdmin);

    req.flush(mockAdmin);
  });

  // ===================== DELETE ADMIN =====================
  it('should delete an admin', () => {
    service.deleteAdmin('1').subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${baseUrl}/superadmin/1`);
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

});
