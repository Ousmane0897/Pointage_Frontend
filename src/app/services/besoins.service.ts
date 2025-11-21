import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CollecteBesoins } from '../models/CollecteBesoins.model';
import { encode } from 'punycode';

@Injectable({
  providedIn: 'root'
})
export class BesoinsService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrlEmploye;

  getById(id: string): Observable<CollecteBesoins> {
    return this.http.get<CollecteBesoins>(`${this.baseUrl}/api/besoins/${id}`);
  }

  createCollecteBesoins(collecteBesoins: CollecteBesoins, createdby?: string): Observable<CollecteBesoins> {
    const parameters: any = {};
    if (createdby) {
      parameters.createdby = createdby;
    }
    return this.http.post<CollecteBesoins>(`${this.baseUrl}/api/besoins`, collecteBesoins, { params: parameters });
  }

  getAllCollecteBesoins(): Observable<CollecteBesoins[]> {
    return this.http.get<CollecteBesoins[]>(`${this.baseUrl}/api/besoins`);
  }

  getBesoinsByDestination(destination: string): Observable<CollecteBesoins[]> {
    return this.http.get<CollecteBesoins[]>(`${this.baseUrl}/api/besoins/destination/${encodeURIComponent(destination)}`); // Encodage de la destination pour gérer les espaces et caractères spéciaux
  }

  getHistoriqueModifications(id: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/api/besoins/historique-modifications/${id}`);
  }

  getBesoinsByMoisActuel(): Observable<CollecteBesoins[]> {
    return this.http.get<CollecteBesoins[]>(`${this.baseUrl}/api/besoins/moisActuel`); // Encodage du moisAnnee pour gérer les espaces et caractères spéciaux
  }

  modifyStatutBesoins(id: string, statut: string, modifiedBy?: string) {
    return this.http.patch<CollecteBesoins>(
      `${this.baseUrl}/api/besoins/statut/${id}`,
      {
        statut: statut,
        modifiedBy: modifiedBy
      }
    );
  }


  modifyCollecteBesoins(id: string, collecteBesoins: CollecteBesoins, modifiedBy?: string): Observable<CollecteBesoins> {
    const parameters: any = {}; // Objet pour les paramètres optionnels
    if (modifiedBy) {
      parameters.modifiedBy = encodeURIComponent(modifiedBy); // Encodage du nom pour gérer les espaces et caractères spéciaux
    }
    return this.http.put<CollecteBesoins>(`${this.baseUrl}/api/besoins/${id}`, collecteBesoins, { params: parameters });
  }

}
