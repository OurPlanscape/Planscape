import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class ModuleService {
  constructor(private http: HttpClient) {}

  public getModule<T>(id: string) {
    return this.http.get<T>(
      `${environment.backend_endpoint}/v2/modules/${id}/`,
      {
        withCredentials: true,
      }
    );
  }
}
