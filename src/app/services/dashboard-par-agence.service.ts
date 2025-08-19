import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class DashboardParAgenceService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrlEmploye;

  getDashboardData(): Observable<{ [site: string]: { total: number; present: number; absent: number } }> {
  return this.http.get<{ [site: string]: { total: number; present: number; absent: number } }>(
    `${this.baseUrl}/api/dashboard_par_agence`
  );
}

}
