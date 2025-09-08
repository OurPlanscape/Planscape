import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiModule, ForsysData } from '../types/module.types';

@Injectable({
  providedIn: 'root',
})
export class ModuleService {
  constructor(private http: HttpClient) {}

  /**
   * Returns module data for forsys
   */
  public getForsysModule() {
    return this.getModule<ApiModule<ForsysData>>('forsys');
  }

  private getModule<T>(id: string) {
    return this.http.get<T>(
      `${environment.backend_endpoint}/v2/modules/${id}/`,
      {
        withCredentials: true,
      }
    );
  }
}
