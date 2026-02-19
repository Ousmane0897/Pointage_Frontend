import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Pointage } from '../models/pointage.model';

@Injectable({
  providedIn: 'root'
})
export class PointageService {

  private readonly deviceIdKey = 'device_id';
  private baseUrl = environment.apiUrlEmploye;

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



  /*pointer(codeSecret: string): Observable<Pointage> {
    const body = {
      codeSecret,
      deviceId: this.getDeviceId()
    };
    console.log("Données envoyées :", body);
    return this.http.post<Pointage>(`${this.baseUrl}/api/pointages`, body);
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
    `${this.baseUrl}/api/pointages`,
    body
  );
}



  getPointages(): Observable<Pointage[]> {
    return this.http.get<Pointage[]>(`${this.baseUrl}/api/pointages`);
  }
}
