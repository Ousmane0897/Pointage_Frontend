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

  private apiUrl =  environment.apiUrlEmploye;

  getAgences(): Observable<Agence[]> {
    return this.http.get<Agence[]>(`${this.apiUrl}/api/agences`);
  }

  getAgenceByNom(nom: string): Observable<Agence> {
    return this.http.get<Agence>(`${this.apiUrl}/api/agences/nom/${nom}`);
  }

  getNumberofEmployeesInOneAgence(nomAgence: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/agences/getNumberofEmployeesInOneAgence/${nomAgence}`);
  }

  MaxNumberOfEmployeesInOneAgence(nomAgence: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/agences/MaxNumberOfEmployeesInOneAgence/${nomAgence}`);
  }
  
 getJoursOuverture(nomAgence: string): Observable<string> {
  return this.http.get<{ joursOuverture: string }>(
    `${this.apiUrl}/api/agences/${nomAgence}`
  ).pipe(
    map(response => response.joursOuverture) // Sachant que le backend retourne {"joursOuverture":"Lundi-Vendredi"}, on recupère la valeur de joursOuverture

  );
}

  createAgence(agence: Agence): Observable<Agence> {
    return this.http.post<Agence>(`${this.apiUrl}/api/agences`, agence);
  }

  getAllSites(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/api/agences/sites`);
  }

  getEmployeesByAgence(nom: string): Observable<Employe[]> {
    return this.http.get<Employe[]>(`${this.apiUrl}/api/agences/site/${nom}`);
  }

  updateAgence(nom: string, agence: Agence): Observable<Agence> {
    return this.http.put<Agence>(`${this.apiUrl}/api/agences/${nom}`, agence);
  }

  deleteAgence(nom: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/agences/${nom}`);
  }

}
