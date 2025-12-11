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

@Injectable({
  providedIn: 'root',
})
export class DataLayersService {
  constructor(private http: HttpClient) {}

  // ERROR_SURVEY - passes response up
  listDataSets(limit: number, offset?: number) {
    return this.http.get<Pagination<DataSet>>(
      environment.backend_endpoint + '/v2/datasets/',
      {
        withCredentials: true,
        params: { limit: limit, ...(offset ? { offset } : {}) },
      }
    );
  }

  // ERROR_SURVEY - passes response up
  listDataLayers(dataSetId: number) {
    return this.http.get<DataLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse/',
      {
        withCredentials: true,
        params: { type: 'RASTER' },
      }
    );
  }

  // ERROR_SURVEY - passes response up
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

  // ERROR_SURVEY - passes response up
  listBaseLayers() {
    return this.http.get<BaseLayer[]>(
      environment.backend_endpoint + '/v2/datasets/999/browse/',
      {
        withCredentials: true,
        params: { type: 'VECTOR' },
      }
    );
  }

  // ERROR_SURVEY - passes response up
  listBaseLayersByDataSet(dataSetId: number) {
    return this.http.get<BaseLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse/',
      {
        withCredentials: true,
        params: { type: 'VECTOR' },
      }
    );
  }

  // ERROR_SURVEY - passes response up
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

  getMaxSlopeLayerId() {
    return this.search('Slope', 1).pipe(map((s) => s.results[0].id));
  }

  getDistanceToRoadsLayerId() {
    return this.search('Distance from Roads - CA', 1).pipe(
      map((s) => s.results[0].id)
    );
  }
}
