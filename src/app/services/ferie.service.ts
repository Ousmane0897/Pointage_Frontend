import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Ferie } from '../models/ferie.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FerieService {

  constructor(private http: HttpClient) { }
 
  private baseUrl =  environment.apiUrl

  getFeries(): Observable<Ferie[]> {
    return this.http.get<Ferie[]>(`${this.baseUrl}/ferie`);
  }

  deleteFerie(date: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/ferie/${date}`);  
  }

  postFerie(ferie: Ferie): Observable<Ferie> {
    return this.http.post<Ferie>(`${this.baseUrl}/ferie`, ferie);
  }

  updateFerie(date: string, ferie: Ferie): Observable<Ferie> {
    return this.http.put<Ferie>(`${this.baseUrl}/ferie/${date}`, ferie);
  }
}
