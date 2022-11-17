import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  map,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';

import { BasePlan, Plan } from './types';

export interface PlanState {
  all: {
    [planId: string]: Plan;
  };
  currentPlanId: Plan['id'] | null;
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

  constructor() {}

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(basePlan: BasePlan): Observable<{ success: boolean; result?: Plan }> {
    const createPlanRequest = this.convertToDbPlan(basePlan);
    // TODO: Update when actual endpoint is known
    return of(this.createPlanMockApi(createPlanRequest)).pipe(
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

  private convertToDbPlan(plan: BasePlan) {
    // TODO: Implement when backend contract is known
    return plan;
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

  /** Temporary stub for the api. */
  private createPlanMockApi(plan: BasePlan): Plan {
    this.tempPlanId = ++this.tempPlanId;
    return {
      ...plan,
      id: this.tempPlanId.toString(),
    };
  }
}
