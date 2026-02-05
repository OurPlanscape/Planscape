import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { HttpClient } from '@angular/common/http';
import {
  BaseLayer,
  DataLayer,
  DataSet,
  Pagination,
  SearchQuery,
  SearchResult,
} from '@types';
import { map, of } from 'rxjs';
import { Geometry } from 'geojson';

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

  listDataLayers(dataSetId: number, module: string, geometry?: Geometry) {
    let body = {
      type: 'RASTER',
      module: module,
    };
    if (geometry) {
      body = {
        ...body,
        ...{ geometry: geometry },
      };
    }
    return this.http.post<DataLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse/',
      body,
      {
        withCredentials: true,
      }
    );
  }

  search(query: SearchQuery) {
    let body = {
      term: query.term,
      type: 'RASTER',
      ...(query.module ? { module: query.module } : {}),
      ...(query.geometry ? { geometry: query.geometry } : {}),
    };

    return this.http.post<Pagination<SearchResult>>(
      environment.backend_endpoint + '/v2/datalayers/find_anything/',
      body,
      {
        withCredentials: true,
        params: {
          limit: query.limit,
          ...(query.offset ? { offset: query.offset } : {}),
        },
      }
    );
  }

  getDataLayersByIds(layer_ids: number[]) {
    // just return empty if there are no layer ids
    if (!layer_ids || layer_ids.length === 0) {
      return of([]);
    }

    const id_list = layer_ids.join(',');
    return this.http
      .get<{ results: DataLayer[] }>(
        environment.backend_endpoint + '/v2/datalayers/',
        {
          withCredentials: true,
          params: { id__in: id_list },
        }
      )
      .pipe(map((response) => response.results));
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
