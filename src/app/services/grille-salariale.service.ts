import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CategorieProfessionnelle,
  FiltreGrilleSalariale,
} from '../models/grille-salariale.model';

/**
 * Service CRUD pour les catégories professionnelles de la grille salariale.
 * Les catégories alimentent les valeurs par défaut du calcul de bulletin.
 */
@Injectable({ providedIn: 'root' })
export class GrilleSalarialeService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  lister(filtres?: FiltreGrilleSalariale): Observable<CategorieProfessionnelle[]> {
    let params = new HttpParams();
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.regimeIpres) params = params.set('regimeIpres', filtres.regimeIpres);
    if (filtres?.actif !== undefined) params = params.set('actif', String(filtres.actif));

    return this.http.get<CategorieProfessionnelle[]>(
      `${this.baseUrl}/paie/grille-salariale`,
      { params },
    );
  }

  getById(id: string): Observable<CategorieProfessionnelle> {
    return this.http.get<CategorieProfessionnelle>(
      `${this.baseUrl}/paie/grille-salariale/${id}`,
    );
  }

  creer(categorie: CategorieProfessionnelle): Observable<CategorieProfessionnelle> {
    return this.http.post<CategorieProfessionnelle>(
      `${this.baseUrl}/paie/grille-salariale`,
      categorie,
    );
  }

  modifier(id: string, categorie: CategorieProfessionnelle): Observable<CategorieProfessionnelle> {
    return this.http.put<CategorieProfessionnelle>(
      `${this.baseUrl}/paie/grille-salariale/${id}`,
      categorie,
    );
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/paie/grille-salariale/${id}`,
    );
  }

  /** Active / désactive une catégorie sans la supprimer. */
  basculerActif(id: string, actif: boolean): Observable<CategorieProfessionnelle> {
    return this.http.patch<CategorieProfessionnelle>(
      `${this.baseUrl}/paie/grille-salariale/${id}/actif`,
      { actif },
    );
  }
}
