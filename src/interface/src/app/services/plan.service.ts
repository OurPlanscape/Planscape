import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, take, tap } from 'rxjs';

import { BackendConstants } from '../backend-constants';
import { BasePlan, Plan, Region } from '../types';
import {
  PlanConditionScores,
  PlanPreview,
  ProjectConfig,
} from './../types/plan.types';

export interface PlanState {
  all: {
    [planId: string]: Plan;
  };
  currentPlanId: Plan['id'] | null;
}

export interface BackendPlan {
  id?: number;
  name: string;
  owner?: number;
  region_name: Region;
  geometry?: GeoJSON.GeoJSON;
  scenarios?: number;
  projects?: number;
  creation_timestamp?: number; // in seconds since epoch
}

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  // Warning: do not mutate state!
  readonly planState$ = new BehaviorSubject<PlanState>({
    all: {}, // All plans indexed by id
    currentPlanId: null,
  });

  constructor(private http: HttpClient) {}

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(
    basePlan: BasePlan
  ): Observable<{ success: boolean; result?: Plan }> {
    return this.createPlanApi(basePlan).pipe(
      take(1),
      map((createdPlan) => {
        return {
          success: true,
          result: createdPlan,
        };
      }),
      tap(({ result: createdPlan }) => {
        this.addPlanToState(createdPlan);
      })
    );
  }

  /** Makes a request to the backend to delete a plan with the given ID. */
  deletePlan(planIds: string[]): Observable<string> {
    return this.http.post<string>(
      BackendConstants.END_POINT.concat(
        '/plan/delete/?id=',
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
        BackendConstants.END_POINT.concat('/plan/get_plan/?id=', planId),
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
  listPlansByUser(userId: string | null): Observable<PlanPreview[]> {
    let url = BackendConstants.END_POINT.concat('/plan/list_plans_by_owner');
    if (userId) {
      url = url.concat('/?owner=', userId);
    }
    return this.http
      .get<BackendPlan[]>(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((dbPlanList) =>
          dbPlanList.map((dbPlan) => this.convertToPlanPreview(dbPlan))
        )
      );
  }

  /** Makes a request to the backend for the average condition scores in a planning area. */
  getConditionScoresForPlanningArea(
    planId: string
  ): Observable<PlanConditionScores> {
    let url = BackendConstants.END_POINT.concat('/plan/scores/?id=', planId);
    return this.http
      .get<PlanConditionScores>(url, {
        withCredentials: true,
      })
      .pipe(take(1));
  }

  /** Creates a project in a plan, and returns an ID which can be used to get or update the
   *  project. */
  createProjectInPlan(planId: string): Observable<number> {
    let url = BackendConstants.END_POINT.concat('/plan/create_project/');
    return this.http
      .post<number>(
        url,
        {
          plan_id: Number(planId),
        },
        {
          withCredentials: true,
        }
      )
      .pipe(take(1));
  }

  /** Updates a project with new parameters. */
  updateProject(projectConfig: ProjectConfig): Observable<number> {
    let url = BackendConstants.END_POINT.concat('/plan/update_project/');
    return this.http
      .put<number>(url, projectConfig, {
        withCredentials: true,
      })
      .pipe(take(1));
  }

  /** Fetches the projects for a plan from the backend. */
  getProjectsForPlan(planId: string): Observable<ProjectConfig[]> {
    let url = BackendConstants.END_POINT.concat(
      '/plan/list_projects_for_plan/?plan_id=',
      planId
    );
    return this.http
      .get(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((response) =>
          (response as any[]).map((config) =>
            this.convertToProjectConfig(config)
          )
        )
      );
  }

  /** Fetches a project by its ID from the backend. */
  getProject(projectId: number): Observable<ProjectConfig> {
    let url = BackendConstants.END_POINT.concat(
      '/plan/get_project/?id=',
      projectId.toString()
    );
    return this.http
      .get(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((response) => this.convertToProjectConfig(response))
      );
  }

  /** Deletes one or more projects from the backend. */
  deleteProjects(projectIds: number[]): Observable<number[]> {
    return this.http.post<number[]>(
      BackendConstants.END_POINT.concat('/plan/delete_projects/'),
      {
        project_ids: projectIds,
      },
      {
        withCredentials: true,
      }
    );
  }

  private convertToPlan(plan: BackendPlan): Plan {
    return {
      id: String(plan.id),
      ownerId: String(plan.owner),
      name: plan.name,
      region: plan.region_name,
      planningArea: plan.geometry,
      savedScenarios: plan.scenarios ?? 0,
      createdTimestamp: this.convertBackendTimestamptoFrontendTimestamp(
        plan.creation_timestamp
      ),
    };
  }

  private convertToDbPlan(plan: BasePlan): BackendPlan {
    return {
      owner: Number(plan.ownerId),
      name: plan.name,
      region_name: plan.region,
      geometry: plan.planningArea,
    };
  }

  private convertToPlanPreview(plan: BackendPlan): PlanPreview {
    return {
      id: String(plan.id),
      name: plan.name,
      region: plan.region_name,
      savedScenarios: plan.scenarios,
      configurations: plan.projects,
      createdTimestamp: this.convertBackendTimestamptoFrontendTimestamp(
        plan.creation_timestamp
      ),
    };
  }

  private convertToProjectConfig(config: any): ProjectConfig {
    return {
      id: config.id,
      max_budget: config.max_budget,
      max_road_distance: config.max_road_distance,
      max_slope: config.max_slope,
      max_treatment_area_ratio: config.max_treatment_area_ratio,
      priorities: config.priorities,
    };
  }

  // Convert the timestamp stored in backend (measured in seconds since the epoch)
  // to the timestamp Angular assumes is used (milliseconds since the epoch).
  convertBackendTimestamptoFrontendTimestamp(
    timestamp: number | undefined
  ): number | undefined {
    return timestamp ? timestamp * 1000 : undefined;
  }

  private addPlanToState(plan: Plan) {
    // Object.freeze() enforces shallow runtime immutability
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
        [plan.id]: plan,
      },
    });

    this.planState$.next(updatedState);
  }

  private createPlanApi(plan: BasePlan): Observable<Plan> {
    const createPlanRequest = this.convertToDbPlan(plan);
    return this.http
      .post(BackendConstants.END_POINT + '/plan/create/', createPlanRequest, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((result) => {
          return {
            ...plan,
            id: result.toString(),
            savedScenarios: 0,
          };
        })
      );
  }
}
