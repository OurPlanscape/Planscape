import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
  region: Region;
  geometry: GeoJSON.GeoJSON;
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
  tempPlanId = 0;

  constructor(private http: HttpClient) {}

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(
    basePlan: BasePlan
  ): Observable<{ success: boolean; result?: Plan }> {
    return of(this.createPlanApi(basePlan)).pipe(
      take(1),
      map((createdPlan) => {
        // Call convertToPlan here
        return {
          success: true,
          result: createdPlan,
        };
      }),
      tap(({ result: createdPlan }) => {
        this.addPlanToState(createdPlan);
      }),
      catchError((e: HttpErrorResponse) => {
        return of({
          success: false,
        });
      })
    );
  }

  private convertToDbPlan(plan: BasePlan): BackendPlan {
    return {
      owner: Number(plan.ownerId),
      name: plan.name,
      region: plan.region,
      geometry: plan.planningArea,
    };
  }

  private convertToPlan() {
    // TODO: Implement when backend response is known
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

  private createPlanApi(plan: BasePlan): Plan {
    const createPlanRequest = this.convertToDbPlan(plan);
    this.tempPlanId = ++this.tempPlanId;
    var planId:number = this.tempPlanId;
    this.http
      .post('/plan/create/', createPlanRequest, { withCredentials: true })
      .subscribe((result) => {
        console.log(result);
        planId = Number(result.toString());
      });

    return {
      ...plan,
      id: String(planId),
    };
  }
}
