import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import {
  BaseLayer,
  DataLayer,
  DataSet,
  Pagination,
  SearchResult,
} from '@types';
import { map } from 'rxjs';

const MOCKED_MULTI = [
  {
    id: 1,
    name: 'Watersheds (HUC-12)',
    path: ['DEMO multi'],
  },
  {
    id: 2,
    name: 'PODs',
    path: ['DEMO multi'],
  },
  {
    id: 3,
    name: 'Subfireshreds',
    path: ['DEMO multi'],
  },
] as BaseLayer[];

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
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse/',
      {
        withCredentials: true,
        params: { type: 'RASTER' },
      }
    );
  }

  search(term: string, limit: number, offset?: number) {
    return this.http.get<Pagination<SearchResult>>(
      environment.backend_endpoint + '/v2/datalayers/find_anything/',
      {
        withCredentials: true,
        params: {
          term,
          type: 'RASTER',
          limit: limit,
          ...(offset ? { offset } : {}),
        },
      }
    );
  }

  listBaseLayers() {
    return (
      this.http
        .get<BaseLayer[]>(
          environment.backend_endpoint + '/v2/datasets/999/browse',
          {
            withCredentials: true,
            params: { type: 'VECTOR' },
          }
        )
        // TODO - remove once we got more layers from API
        .pipe(map((s) => [...s, ...MOCKED_MULTI]))
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
