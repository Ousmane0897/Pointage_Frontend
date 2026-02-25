import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Agence } from '../models/agences.model';
import { Observable } from 'rxjs';
import { Employe } from '../models/employe.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AgencesService {

  constructor(private http: HttpClient) { }

  private apiUrl = environment.apiUrl;
 

  getAgences(): Observable<Agence[]> {
    return this.http.get<Agence[]>(`${this.apiUrl}/agences`);
  }

  getAgenceByNom(nom: string): Observable<Agence> {
    return this.http.get<Agence>(`${this.apiUrl}/agences/nom?nomAgence=${encodeURIComponent(nom)}`);
  }
  //site=${encodeURIComponent(nomAgence)}`) représente un paramètre de requete
  getNumberofEmployeesInOneAgence(nomAgence: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/agences/getNumberofEmployeesInOneAgence?nomAgence=${encodeURIComponent(nomAgence)}`);
  }

  getEmployeeDeplacee(nomAgence: string): Observable<Employe> {
    return this.http.get<Employe>(`${this.apiUrl}/agences/getEmployeeDeplacee?nomAgence=${encodeURIComponent(nomAgence)}`);
  }

  getEmployeeRemplacee(nomAgence: string): Observable<Employe> {
    return this.http.get<Employe>(`${this.apiUrl}/agences/getEmployeeRemplacee?nomAgence=${encodeURIComponent(nomAgence)}`);
  }

  MaxNumberOfEmployeesInOneAgence(nomAgence: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/agences/MaxNumberOfEmployeesInOneAgence?nomAgence=${encodeURIComponent(nomAgence)}`);
  }

  getJoursOuverture(nomAgence: string): Observable<string> {
  return this.http.get(
    `${this.apiUrl}/agences/${encodeURIComponent(nomAgence)}`,
    { responseType: 'text' } // Spécifie que la réponse est de type texte par exemple "Lundi-Vendredi"
  );
}


  createAgence(agence: Agence): Observable<Agence> {
    return this.http.post<Agence>(`${this.apiUrl}/agences`, agence);
  }

  getAllSites(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/agences/sites`);
  }

  getEmployeesByAgence(nom: string): Observable<Employe[]> {
    return this.http.get<Employe[]>(`${this.apiUrl}/agences/site?nomAgence=${encodeURIComponent(nom)}`);
  }

  updateAgence(nom: string, agence: Agence): Observable<Agence> {
    return this.http.put<Agence>(`${this.apiUrl}/agences/${nom}`, agence);
  }

  deleteAgence(nom: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/agences/${nom}`);
  }

}
