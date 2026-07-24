import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ParametresProductionChimie } from '../models/production-parametres.model';

/**
 * Paramétrage global du module Production Chimie (singleton serveur).
 * Endpoint : GET/PUT `/production-chimie/parametres`.
 */
@Injectable({ providedIn: 'root' })
export class ProductionParametresService {

  private baseUrl = `${environment.apiUrl}/production-chimie/parametres`;

  constructor(private http: HttpClient) {}

  getParametres(): Observable<ParametresProductionChimie> {
    return this.http.get<ParametresProductionChimie>(this.baseUrl);
  }

  modifierParametres(parametres: ParametresProductionChimie): Observable<ParametresProductionChimie> {
    return this.http.put<ParametresProductionChimie>(this.baseUrl, parametres);
  }
}
