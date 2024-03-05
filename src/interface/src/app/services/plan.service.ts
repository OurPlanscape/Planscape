import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, take } from 'rxjs';

import { BackendConstants } from '../backend-constants';
import { ActualPlan, CreatePlanPayload } from '../types';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  constructor(private http: HttpClient) {}

  planNameExists(planName: string) {
    return this.listPlansByUser().pipe(
      map((plans) => plans.some((plan) => plan.name === planName))
    );
  }

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(payload: CreatePlanPayload): Observable<ActualPlan> {
    return this.http.post<ActualPlan>(
      BackendConstants.END_POINT + '/planning/create_planning_area/',
      payload,
      {
        withCredentials: true,
      }
    );
  }

  /** Makes a request to the backend to delete a plan with the given ID. */
  deletePlan(planIds: string[]): Observable<string> {
    return this.http.post<string>(
      BackendConstants.END_POINT.concat(
        '/planning/delete_planning_area/?id=',
        planIds.toString()
      ),
      {
        id: planIds,
      },
      {
        withCredentials: true,
      }
    );
  }

  /** Makes a request to the backend to fetch a plan with the given ID. */
  getPlan(planId: string): Observable<ActualPlan> {
    return this.http.get<ActualPlan>(
      BackendConstants.END_POINT.concat(
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
  listPlansByUser(): Observable<ActualPlan[]> {
    let url = BackendConstants.END_POINT.concat(
      '/planning/list_planning_areas'
    );
    return this.http.get<ActualPlan[]>(url, {
      withCredentials: true,
    });
  }

  /** Updates a planning area with new parameters. */
  updatePlanningArea(
    planningAreaConfig: ActualPlan,
    planId: number
  ): Observable<number> {
    const url = BackendConstants.END_POINT.concat(
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
}
