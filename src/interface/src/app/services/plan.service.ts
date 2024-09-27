import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  CreatePlanPayload,
  Creator,
  Pagination,
  Plan,
  PreviewPlan,
} from '@types';
import { GeoJSON, GeoJsonObject } from 'geojson';
import { environment } from '../../environments/environment';
import { Params } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  readonly v2basePath = environment.backend_endpoint + '/v2/planningareas/';

  constructor(private http: HttpClient) {}

  planNameExists(planName: string) {
    return this.listPlansByUser().pipe(
      map((plans) => plans.some((plan) => plan.name === planName))
    );
  }

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(payload: CreatePlanPayload): Observable<Plan> {
    return this.http.post<Plan>(this.v2basePath, payload, {
      withCredentials: true,
    });
  }

  /** Makes a request to the backend to delete a plan with the given ID. */
  deletePlan(planId: number): Observable<void> {
    return this.http.delete<void>(this.v2basePath + planId, {
      withCredentials: true,
    });
  }

  /** Makes a request to the backend to fetch a plan with the given ID. */
  getPlan(planId: string): Observable<Plan> {
    return this.http.get<Plan>(this.v2basePath + planId, {
      withCredentials: true,
    });
  }

  /** Makes a request to the backend for a list of all plans owned by a user.
   *  If the user is not provided, return all plans with owner=null.
   *  @deprecated use getPlanPreviews
   */
  listPlansByUser(): Observable<PreviewPlan[]> {
    let url = environment.backend_endpoint.concat(
      '/planning/list_planning_areas'
    );
    return this.http.get<PreviewPlan[]>(url, {
      withCredentials: true,
    });
  }

  getPlanPreviews(params: Params) {
    return this.http.get<Pagination<PreviewPlan>>(this.v2basePath, {
      withCredentials: true,
      params: params,
    });
  }

  getCreators() {
    let url = this.v2basePath + 'creators/';
    return this.http.get<Creator[]>(url, {
      withCredentials: true,
    });
  }

  getTotalArea(shape: GeoJSON) {
    return this.http
      .post<{
        area_acres: number;
      }>(
        environment.backend_endpoint.concat(
          `/planning/validate_planning_area/`
        ),
        { geometry: shape }
      )
      .pipe(map((result) => Math.round(result.area_acres)));
  }

  //TODO: This might be better in its own Service file
  uploadGeometryForNewScenario(
    shape: GeoJsonObject,
    scenarioName: string,
    standSize: string,
    planId: string
  ) {
    return this.http.post(
      environment.backend_endpoint.concat('/v2/scenarios/upload_shapefiles/'),
      {
        geometry: shape,
        name: scenarioName,
        stand_size: standSize,
        planning_area: planId,
      },
      {
        withCredentials: true,
      }
    );
  }
}
