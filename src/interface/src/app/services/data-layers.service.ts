import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import {
  BaseLayer,
  DataLayer,
  DataSet,
  Pagination,
  SearchQuery,
  SearchResult,
} from '@types';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataLayersService {
  constructor(private http: HttpClient) {}

  listDataSets(limit: number, offset?: number) {
    return this.http.get<Pagination<DataSet>>(
      environment.backend_endpoint + '/v2/datasets/',
      {
        withCredentials: true,
        params: { limit: limit, ...(offset ? { offset } : {}) },
      }
    );
  }

  listDataLayers(dataSetId: number) {
    return this.http.get<DataLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse/',
      {
        withCredentials: true,
        params: { type: 'RASTER' },
      }
    );
  }

  search(query: SearchQuery) {
    return this.http.get<Pagination<SearchResult>>(
      environment.backend_endpoint + '/v2/datalayers/find_anything/',
      {
        withCredentials: true,
        params: {
          term: query.term,
          type: 'RASTER',
          limit: query.limit,
          ...(query.offset ? { offset: query.offset } : {}),
          ...(query.module ? { module: query.module } : {}),
        },
      }
    );
  }

  listBaseLayersByDataSet(dataSetId: number) {
    return this.http.get<BaseLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse/',
      {
        withCredentials: true,
        params: { type: 'VECTOR' },
      }
    );
  }

  getPublicUrl(id: number) {
    return this.http
      .get<{ layer_url: string }>(
        environment.backend_endpoint + `/v2/datalayers/${id}/urls/`,
        {
          withCredentials: true,
        }
      )
      .pipe(map((data) => data.layer_url));
  }
}
