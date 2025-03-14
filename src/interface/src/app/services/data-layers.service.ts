import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { DataLayer, DataSet, Pagination, SearchResult } from '@types';

@Injectable({
  providedIn: 'root',
})
export class DataLayersService {
  constructor(private http: HttpClient) {}

  listDataSets() {
    return this.http.get<Pagination<DataSet>>(
      environment.backend_endpoint + '/v2/datasets/',
      {
        withCredentials: true,
        params: {},
      }
    );
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

  search(term: string) {
    return this.http.get<SearchResult[]>(
      environment.backend_endpoint + '/v2/datalayers/find_anything',
      {
        withCredentials: true,
        params: { term },
      }
    );
  }
}
