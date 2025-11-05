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

  updateAbsent(codeSecret: string, absent: Absent): Observable<Absent> {
    return this.http.put<Absent>(`${this.baseUrl}/api/absences/${codeSecret}`, absent);
  }

  AbsenceTempsReel(): Observable<Absent[]> {
    return this.http.get<Absent[]>(`${this.baseUrl}/api/absences/temps-reel`);
  }

  AbsenceHistorique(): Observable<Absent[]> {
    return this.http.get<Absent[]>(`${this.baseUrl}/api/absences`);
  }




}
