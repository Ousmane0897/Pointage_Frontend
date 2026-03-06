import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Pointage } from '../models/pointage.model';

@Injectable({
  providedIn: 'root'
})
export class PointageService {

  private readonly deviceIdKey = 'device_id';
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    this.createDeviceId();
  }

  private createDeviceId() {
    if (!localStorage.getItem(this.deviceIdKey)) {
      const newId = crypto.randomUUID();
      localStorage.setItem(this.deviceIdKey, newId);
    }
  }

  getDeviceId(): string {
    let id = localStorage.getItem('device_id');

    if (!id || id.length < 10) {
      id = crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }

    return id;
  }


  /*getDeviceId(): string {
    return localStorage.getItem(this.deviceIdKey)!;
  }*/



  pointer(payload: {
    codeSecret: string;
    deviceId?: string;
    latitude?: number;
    longitude?: number;
  }): Observable<Pointage> {

    const body = {
      codeSecret: payload.codeSecret,
      deviceId: payload.deviceId ?? this.getDeviceId(),
      latitude: payload.latitude,
      longitude: payload.longitude
    };

    console.log('Données envoyées :', body);

    return this.http.post<Pointage>(
      `${this.baseUrl}/pointages`,
      body
    );
  }



  getPointages(): Observable<Pointage[]> {
    return this.http.get<Pointage[]>(`${this.baseUrl}/pointages`);
  }

  searchHistorique(
    search: string = '', // 🔎 Terme de recherche (nom, prénom, code employé). La valeur par défaut est une chaîne vide.
    dateDebut: string,
    dateFin: string,
    page: number,
    size: number
  ): Observable<any> {

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (search) params = params.set('search', search);
    if (dateDebut) params = params.set('dateDebut', dateDebut);
    if (dateFin) params = params.set('dateFin', dateFin);

    return this.http.get<any>(
      `${this.baseUrl}/pointages/historique/search`,
      { params }
    );
  }

  
  // Le service retournera tout l’historique si les paramètres de recherche sont vides, ou filtrera les résultats en fonction des critères fournis (search, dateDebut, dateFin).
  exportExcel(search?: string, dateDebut?: string, dateFin?: string) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (dateDebut) params = params.set('dateDebut', dateDebut);
    if (dateFin) params = params.set('dateFin', dateFin);

    return this.http.get(
      `${this.baseUrl}/pointages/historique/export/excel`,
      { params, responseType: 'blob' }
    );
  }

  // Le service retournera tout l’historique si les paramètres de recherche sont vides, ou filtrera les résultats en fonction des critères fournis (search, dateDebut, dateFin).
  exportPdf(search?: string, dateDebut?: string, dateFin?: string) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (dateDebut) params = params.set('dateDebut', dateDebut);
    if (dateFin) params = params.set('dateFin', dateFin);

    return this.http.get(
      `${this.baseUrl}/pointages/historique/export/pdf`,
      { params, responseType: 'blob' } //  responseType : indique que la réponse est un fichier binaire (Blob)
    );
  }
}
