import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, take } from 'rxjs';
import {
  CreatePlanPayload,
  Creator,
  Pagination,
  Plan,
  PreviewPlan,
} from '@types';
import { GeoJSON } from 'geojson';
import { environment } from '../../environments/environment';
import { Params } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly v2basePath = '/v2/planningareas/';

  constructor(private http: HttpClient) {}

  planNameExists(planName: string) {
    return this.listPlansByUser().pipe(
      map((plans) => plans.some((plan) => plan.name === planName))
    );
  }

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(payload: CreatePlanPayload): Observable<Plan> {
    return this.http.post<Plan>(
      environment.backend_endpoint + '/planning/create_planning_area/',
      payload,
      {
        withCredentials: true,
      }
    );
  }

  /** Makes a request to the backend to delete a plan with the given ID. */
  deletePlan(planIds: string[]): Observable<string>;
  deletePlan(planId: number): Observable<string>;
  deletePlan(planIdsOrId: string[] | number): Observable<string> {
    let ids: string[];

    if (typeof planIdsOrId === 'number') {
      ids = [planIdsOrId.toString()];
    } else {
      ids = planIdsOrId;
    }

    return this.http.post<string>(
      environment.backend_endpoint.concat(
        '/planning/delete_planning_area/?id=',
        ids.toString()
      ),
      {
        id: ids,
      },
      {
        withCredentials: true,
      }
    );
  }

  /** Makes a request to the backend to fetch a plan with the given ID. */
  getPlan(planId: string): Observable<Plan> {
    return this.http.get<Plan>(
      environment.backend_endpoint.concat(
        '/planning/get_planning_area_by_id/?id=',
        planId
      ),
      {
        withCredentials: true,
      }
    );
  }

  /** Makes a request to the backend for a list of all plans owned by a user.
   *  If the user is not provided, return all plans with owner=null.
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
    let url = environment.backend_endpoint.concat(this.v2basePath);

    return this.http.get<Pagination<PreviewPlan>>(url, {
      withCredentials: true,
      params: params,
    });
  }

  getCreators() {
    let url = environment.backend_endpoint.concat(
      '/planning/v2/planningareas/creators/'
    );
    return this.http.get<Creator[]>(url, {
      withCredentials: true,
    });
  }

  /** Updates a planning area with new parameters. */
  updatePlanningArea(
    planningAreaConfig: Plan,
    planId: number
  ): Observable<number> {
    const url = environment.backend_endpoint.concat(
      '/planning/update_planning_area/'
    );
    return this.http
      .patch<number>(
        url,
        {
          id: planId,
          notes: planningAreaConfig.notes,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(take(1));
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
}
