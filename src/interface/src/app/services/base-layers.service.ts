import { Injectable } from '@angular/core';
import { DataLayer } from '@types';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class BaseLayersService {
  constructor(private http: HttpClient) {}

  listDataLayers(dataSetId: number) {
    return this.http.get<DataLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse',
      {
        withCredentials: true,
        params: { type: 'VECTOR' },
      }
    );
  }
}
