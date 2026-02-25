import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StockService } from './stock.service';
import { environment } from '../../environments/environment';
import { MouvementEntreeStock } from '../models/MouvementEntreeStock.model';
import { MouvementSortieStock, SortieStockBatch } from '../models/MouvementSortieStock.model';
import { Produit } from '../models/produit.model';

describe('StockService', () => {
  let service: StockService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // ✅ indispensable
      providers: [StockService]
    });

    service = TestBed.inject(StockService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // ✅ vérifie qu’aucune requête HTTP n’est oubliée
  });

  // ===============================
  // 🟢 CRÉATION
  // ===============================
  it('doit être créé', () => {
    expect(service).toBeTruthy();
  });

  // ===============================
  // 📥 ENTRÉES DE STOCK
  // ===============================

  it('doit récupérer les entrées de stock', () => {
    const mockEntrees: MouvementEntreeStock[] = [
      { id: '1' } as MouvementEntreeStock
    ];

    service.getEntrees().subscribe(entrees => {
      expect(entrees).toEqual(mockEntrees);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/stock/entrees`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEntrees);
  });

  it('doit ajouter une entrée de stock', () => {
    const entree = { produit: 'Savon', quantite: 10 };

    service.ajouterEntree(entree).subscribe(response => {
      expect(response).toEqual({ success: true });
    });

    const req = httpMock.expectOne(`${baseUrl}/api/stock/mouvement`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(entree);
    req.flush({ success: true });
  });

  // ===============================
  // 📦 PRODUITS
  // ===============================

  it('doit récupérer la liste des produits', () => {
    const produits: Produit[] = [
      { id: '1', nom: 'Savon' } as unknown as Produit
    ];

    service.getProduits().subscribe(result => {
      expect(result).toEqual(produits);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/produits/all`);
    expect(req.request.method).toBe('GET');
    req.flush(produits);
  });

  it('doit récupérer le stock actuel d’un produit', () => {
    service.getStockProduit('123').subscribe(stock => {
      expect(stock).toBe(25);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/stock/produit/quantite/123`
    );
    expect(req.request.method).toBe('GET');
    req.flush(25);
  });

  // ===============================
  // 🚚 SORTIES DE STOCK
  // ===============================

  it('doit créer une sortie simple', () => {
    const sortie: MouvementSortieStock = {
      produit: 'Savon',
      quantite: 5
    } as unknown as MouvementSortieStock;

    service.creerSortieSimple(sortie).subscribe(res => {
      expect(res).toEqual(sortie);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/stock/sortie/simple`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(sortie);
    req.flush(sortie);
  });

  it('doit créer une sortie batch', () => {
    const batch: SortieStockBatch = {
      destination: 'Cuisine',
      mouvements: []
    } as unknown as SortieStockBatch;

    service.creerSortieBatch(batch).subscribe(res => {
      expect(res).toEqual({ success: true });
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/stock/sorties/batch`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(batch);
    req.flush({ success: true });
  });

  it('doit récupérer les sorties de stock', () => {
    const sorties: MouvementSortieStock[] = [
      { id: '1' } as MouvementSortieStock
    ];

    service.getSorties().subscribe(res => {
      expect(res).toEqual(sorties);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/stock/sorties`);
    expect(req.request.method).toBe('GET');
    req.flush(sorties);
  });

  // ===============================
  // 📊 SUIVI DE STOCK
  // ===============================

  it('doit récupérer le suivi de stock', () => {
    const suivi = [{ produit: 'Savon', stock: 20 }];

    service.getSuiviStock().subscribe(res => {
      expect(res).toEqual(suivi as any);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/stock/suivi`);
    expect(req.request.method).toBe('GET');
    req.flush(suivi);
  });
});
