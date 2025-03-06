import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { DataLayer, DataSet } from '../types/data-sets';

@Injectable({
  providedIn: 'root',
})
export class DataLayersService {
  constructor(private http: HttpClient) {}

  listDataSets() {
    return this.http
      .get<{ results: DataSet[] }>(
        environment.backend_endpoint + '/v2/datasets/',
        {
          withCredentials: true,
          params: {},
        }
      )
      .pipe(map((response) => response.results));
  }

  listDataLayers(dataSetId: number) {
    return this.http.get<DataLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse',
      {
        withCredentials: true,
        params: {},
      }
    );
  }
}
