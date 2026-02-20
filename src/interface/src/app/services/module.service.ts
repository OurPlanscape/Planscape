import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Geometry } from 'geojson';

@Injectable({
  providedIn: 'root',
})
export class ModuleService {
  constructor(private http: HttpClient) {}

  public getModule<T>(id: string, filters?: { geometry: Geometry }) {
    const url = `${environment.backend_endpoint}/v2/modules/${id}/`;
    if (!filters) {
      return this.http.get<T>(url, {
        withCredentials: true,
      });
    } else {
      return this.http.post<T>(url + 'details/', filters, {
        withCredentials: true,
      });
    }
  }
}
