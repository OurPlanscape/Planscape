import { Injectable } from '@angular/core';
import { Plan } from '@types';
import { Geometry } from 'geojson';
import { BehaviorSubject, filter, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlanState {
  /**
   * Our current plan. It should reflect the selected plan
   */
  private _currentPlan$ = new BehaviorSubject<Plan | null>(null);
  currentPlan$ = this._currentPlan$.asObservable();

  /**
   *
   * The Planning Area geometry
   */
  planningAreaGeometry$ = this.currentPlan$.pipe(
    filter((plan) => !!plan),
    map((plan) => plan?.geometry as Geometry)
  );

  setCurrentPlan(plan: Plan) {
    this._currentPlan$.next(plan);
  }

  getCurrentPlan(): Plan | null {
    return this._currentPlan$.value;
  }
}
