import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Pointage } from '../models/pointage.model';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class PageCodeService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrlEmploye;

  getPointageById(codeSecret: string): Observable<Pointage> {
      return this.http.get<Pointage>(`${this.baseUrl}/api/pointages/${codeSecret}`); 
    }
}
