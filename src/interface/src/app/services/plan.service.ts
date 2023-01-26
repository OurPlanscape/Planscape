import { PlanPreview, PlanConditionScores } from './../types/plan.types';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BackendConstants } from '../backend-constants';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';

import { BasePlan, Plan, Region } from '../types';

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
      }),
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

  private convertToPlan(plan: BackendPlan): Plan {
    return {
      id: String(plan.id),
      ownerId: String(plan.owner),
      name: plan.name,
      region: plan.region_name,
      planningArea: plan.geometry,
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
      createdTimestamp: this.convertBackendTimestamptoFrontendTimestamp(
        plan.creation_timestamp
      ),
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
          };
        })
      );
  }
}
