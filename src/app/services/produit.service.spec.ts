import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProduitService } from './produit.service';
import { environment } from '../../environments/environment';
import { Produit } from '../models/produit.model';

describe('ProduitService', () => {
  let service: ProduitService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrlEmploye;

  // ✅ Mock Produit complet (évite les erreurs TS)
  const produitMock: Produit = {
    id: '1',
    codeProduit: 'PRD-001',
    nomProduit: 'Savon',
    description: 'Savon liquide',
    categorie: 'Hygiène',
    destination: 'Agence',
    uniteDeMesure: 'Litre',
    conditionnement: 'Bidon 5L',
    prixDeVente: 2500,
    emplacement: 'Entrepôt A',
    seuilMinimum: 10,
    statut: 'DISPONIBLE',
    quantiteSnapshot: 50
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProduitService]
    });

    service = TestBed.inject(ProduitService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // 🔴 Vérifie qu'aucune requête n'est oubliée
  });

  // ===============================
  // 🟢 GET PRODUITS PAGINÉS
  // ===============================
  it('doit récupérer une liste paginée de produits avec recherche', () => {
    service.getProduits(1, 10, 'savon').subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.content[0].nomProduit).toBe('Savon');
      expect(res.total).toBe(1);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/produits?page=1&size=10&q=savon`
    );
    expect(req.request.method).toBe('GET');

    req.flush({ content: [produitMock], total: 1 });
  });

  // ===============================
  // 🟢 GET PRODUIT BY ID
  // ===============================
  it('doit récupérer un produit par ID', () => {
    service.getProduitById('1').subscribe(res => {
      expect(res.id).toBe('1');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/produits/1`);
    expect(req.request.method).toBe('GET');

    req.flush(produitMock);
  });

  // ===============================
  // 🟢 GET ALL PRODUITS
  // ===============================
  it('doit récupérer tous les produits', () => {
    service.getAllProduits().subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/produits/all`);
    expect(req.request.method).toBe('GET');

    req.flush([produitMock]);
  });

  // ===============================
  // 🟢 CREATE PRODUIT
  // ===============================
  it('doit créer un produit', () => {
    service.createProduit(produitMock).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/api/produits`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(produitMock);

    req.flush({ success: true });
  });

  // ===============================
  // 🟢 FILTER BY CATEGORY
  // ===============================
  it('doit filtrer les produits par catégorie', () => {
    service.filtrerProduitsByCategory('Hygiène').subscribe(res => {
      expect(res.content.length).toBe(1);
    });

    const req = httpMock.expectOne(req =>
      req.url === `${baseUrl}/api/produits/categorie` &&
      req.params.get('category') === 'Hygiène'
    );

    expect(req.request.method).toBe('GET');
    req.flush({ content: [produitMock] });
  });


  // ===============================
  // 🟢 FILTER BY DESTINATION
  // ===============================
  it('doit filtrer les produits par destination', () => {
    service.filtrerProduitsByDestination('Cuisine').subscribe(res => {
      expect(res.content.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/produits/destination?destination=Cuisine`
    );
    expect(req.request.method).toBe('GET');

    req.flush({ content: [produitMock] });
  });

  // ===============================
  // 🟢 GET PRODUIT BY CODE
  // ===============================
  it('doit récupérer un produit par code', () => {
    service.getProduitByCode('PRD-001').subscribe(res => {
      expect(res.codeProduit).toBe('PRD-001');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/produits/code?codeProduit=PRD-001`
    );
    expect(req.request.method).toBe('GET');

    req.flush(produitMock);
  });

  // ===============================
  // 🟢 GET PRODUIT BY NAME
  // ===============================
  it('doit récupérer un produit par nom', () => {
    service.getProduitByName('Savon').subscribe(res => {
      expect(res.nomProduit).toBe('Savon');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/produits/nom?nomProduit=Savon`
    );
    expect(req.request.method).toBe('GET');

    req.flush(produitMock);
  });

  // ===============================
  // 🟢 UPDATE PRODUIT
  // ===============================
  it('doit mettre à jour un produit', () => {
    const payload = { nomProduit: 'Savon Modifié' };

    service.updateProduit('1', payload).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/api/produits/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);

    req.flush({ success: true });
  });

  // ===============================
  // 🟢 GET IMAGE URL
  // ===============================
  it('doit récupérer l’URL de l’image du produit', () => {
    service.getProduitImageUrl('1').subscribe(res => {
      expect(res.imageUrl).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/api/produits/image/1`);
    expect(req.request.method).toBe('GET');

    req.flush({ imageUrl: 'http://image.png' });
  });

  // ===============================
  // 🟢 DELETE PRODUIT
  // ===============================
  it('doit supprimer un produit', () => {
    service.deleteProduit('1').subscribe(res => {
      expect(res).toBeNull(); // ✅ CORRECT
    });

    const req = httpMock.expectOne(`${baseUrl}/api/produits/1`);
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

});
