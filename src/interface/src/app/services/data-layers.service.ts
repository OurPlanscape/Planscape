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
  SearchTab,
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

  listDataLayers(
    dataSetId: number,
    module: string,
    geometry?: Geometry,
    workspaceId?: number | null,
    searchTab?: SearchTab
  ) {
    return this.browse(
      'datasets',
      dataSetId,
      module,
      geometry,
      workspaceId,
      searchTab
    );
  }

  listCategoryDataLayers(
    categoryId: number,
    module: string,
    geometry?: Geometry,
    workspaceId?: number | null
  ) {
    return this.browse('categories', categoryId, module, geometry, workspaceId);
  }

  private browse(
    resource: 'datasets' | 'categories',
    id: number,
    module: string,
    geometry?: Geometry,
    // If we send workspaceId we get is_favorite from backend
    workspaceId?: number | null,
    searchTab?: SearchTab
  ) {
    return this.http.post<DataLayer[]>(
      `${environment.backend_endpoint}/v2/${resource}/${id}/browse/`,
      {
        type: 'RASTER',
        module,
        ...(geometry ? { geometry } : {}),
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        ...(searchTab ? { search_tab: searchTab } : {}),
      },
      {
        withCredentials: true,
      }
    );
  }

  browseFavorites(
    workspaceId: number,
    module?: string,
    geometry?: Geometry,
    type: 'RASTER' | 'VECTOR' = 'RASTER'
  ) {
    return this.http.post<DataLayer[]>(
      `${environment.backend_endpoint}/v2/datalayers/browse/`,
      {
        search_tab: 'favorites',
        workspace_id: workspaceId,
        type,
        ...(module ? { module } : {}),
        ...(geometry ? { geometry } : {}),
      },
      { withCredentials: true }
    );
  }

  browseUploads(
    workspaceId: number | null,
    module?: string,
    geometry?: Geometry,
    type: 'RASTER' | 'VECTOR' = 'RASTER'
  ) {
    return this.http.post<DataLayer[]>(
      `${environment.backend_endpoint}/v2/datalayers/browse/`,
      {
        search_tab: 'uploaded',
        type,
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        ...(module ? { module } : {}),
        ...(geometry ? { geometry } : {}),
      },
      { withCredentials: true }
    );
  }

  search(query: SearchQuery) {
    let body = {
      term: query.term,
      type: query.type ?? 'RASTER',
      ...(query.module ? { module: query.module } : {}),
      ...(query.geometry ? { geometry: query.geometry } : {}),
      ...(query.workspaceId ? { workspace_id: query.workspaceId } : {}),
      ...(query.searchTab ? { search_tab: query.searchTab } : {}),
      ...(query.groupBy ? { group_by: query.groupBy } : {}),
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

  getDataLayerById(id: number) {
    return this.http.get<DataLayer>(
      environment.backend_endpoint + '/v2/datalayers/' + id + '/',
      {
        withCredentials: true,
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

  listBaseLayersByDataSet(
    dataSetId: number,
    module: string,
    geometry?: Geometry,
    workspaceId?: number | null
  ) {
    return this.http.post<BaseLayer[]>(
      environment.backend_endpoint + '/v2/datasets/' + dataSetId + '/browse/',
      {
        type: 'VECTOR',
        module: module,
        ...(geometry ? { geometry } : {}),
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
      },
      {
        withCredentials: true,
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
