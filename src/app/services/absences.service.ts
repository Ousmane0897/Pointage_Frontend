import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Absent } from '../models/absent.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AbsencesService {

  constructor(private http: HttpClient) { }
  
  private baseUrl =  environment.apiUrlEmploye;
 
  getAbsences(): Observable<Absent[]> {
    return this.http.get<Absent[]>(`${this.baseUrl}/api/absences`);
  }

  updateAbsent(id: string, absent: Absent): Observable<Absent> {
    return this.http.put<Absent>(`${this.baseUrl}/api/absences/${id}`, absent);
  }




}
