import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, take } from 'rxjs';

import { BackendConstants } from '../backend-constants';
import {
  BackendPlan,
  BackendPlanPreview,
  BasePlan,
  Plan,
  PlanConditionScores,
} from '../types';
import { PlanPreview } from './../types/plan.types';

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

  // TODO clean up requests with string interpolation
  /**  TODO Reimplement:
   * bulkCreateProjectAreas
   * */

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(basePlan: BasePlan): Observable<{
    success: boolean;
    result: Plan;
  }> {
    return this.createPlanApi(basePlan).pipe(
      take(1),
      map((createdPlan) => {
        return {
          success: true,
          result: createdPlan,
        };
      })
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
  getPlan(planId: string): Observable<Plan> {
    return this.http
      .get<BackendPlan>(
        BackendConstants.END_POINT.concat(
          '/planning/get_planning_area_by_id/?id=',
          planId
        ),
        {
          withCredentials: true,
        }
      )
      .pipe(
        take(1),
        map((dbPlan) => this.convertToPlan(dbPlan))
      );
  }

  /** Makes a request to the backend for a list of all plans owned by a user.
   *  If the user is not provided, return all plans with owner=null.
   */
  listPlansByUser(): Observable<PlanPreview[]> {
    let url = BackendConstants.END_POINT.concat(
      '/planning/list_planning_areas'
    );

    return this.http
      .get<BackendPlanPreview[]>(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((dbPlanList) =>
          dbPlanList.map((dbPlan) => this.convertToPlanPreview(dbPlan))
        )
      );
  }

  // TODO REMOVE
  /** Makes a request to the backend for the average condition scores in a planning area. */
  getConditionScoresForPlanningArea(
    planId: string
  ): Observable<PlanConditionScores> {
    const url = BackendConstants.END_POINT.concat('/plan/scores/?id=', planId);
    return this.http
      .get<PlanConditionScores>(url, {
        withCredentials: true,
      })
      .pipe(take(1));
  }

  private convertToPlan(plan: BackendPlan): Plan {
    return {
      id: String(plan.id),
      ownerId: String(plan.user),
      name: plan.name,
      region: plan.region_name,
      planningArea: plan.geometry,
      scenarios: plan.scenario_count ?? 0,
      notes: plan.notes ?? '',
      configs: plan.projects ?? 0,
      createdTimestamp: plan.created_at ? new Date(plan.created_at) : undefined,
      lastUpdated: plan.latest_updated
        ? new Date(plan.latest_updated)
        : undefined,
    };
  }

  private convertToDbPlan(plan: BasePlan): BackendPlan {
    return {
      user: Number(plan.ownerId),
      name: plan.name,
      region_name: plan.region,
      geometry: plan.planningArea,
      notes: plan.notes,
    };
  }

  private convertToPlanPreview(plan: BackendPlanPreview): PlanPreview {
    return {
      id: plan.id,
      name: plan.name,
      region: plan.region_name,
      scenarios: plan.scenario_count,
      notes: plan.notes,
      lastUpdated: plan.latest_updated
        ? new Date(plan.latest_updated)
        : undefined,
      geometry: plan.geometry,
      ownerId: plan.user,
    };
  }

  private createPlanApi(plan: BasePlan): Observable<Plan> {
    const createPlanRequest = this.convertToDbPlan(plan);
    return this.http
      .post(
        BackendConstants.END_POINT + '/planning/create_planning_area/',
        createPlanRequest,
        {
          withCredentials: true,
        }
      )
      .pipe(
        take(1),
        map((result: any) => {
          return {
            ...plan,
            id: result['id'].toString(),
            ownerId: result.ownerId,
            savedScenarios: 0,
          };
        })
      );
  }

  /** Updates a planning area with new parameters. */
  updatePlanningArea(
    planningAreaConfig: BasePlan,
    planId: string
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
