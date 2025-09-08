import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

interface Module<T> {
  name: string;
  options: T;
}

interface ForsysData {
  includes: number[];
  excludes: number[];
  thresholds: {
    slope: { id: number };
    distance_from_roads: { id: number };
  };
}

@Injectable({
  providedIn: 'root',
})
export class ModuleService {
  constructor(private http: HttpClient) {}

  /**
   * Returns module data for forsys
   */
  public getForsysModule() {
    return this.getModule<Module<ForsysData>>('forsys');
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
