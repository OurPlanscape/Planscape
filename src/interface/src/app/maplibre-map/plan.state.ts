import { Injectable } from '@angular/core';
import { Plan, Scenario } from '@types';
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
   * Our current scenario. It should reflect the selected scenario
   */
  private _currentScenario$ = new BehaviorSubject<Scenario | null>(null);
  currentScenario$ = this._currentScenario$.asObservable();

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

  setCurrentScenario(scenario: Scenario | null) {
    this._currentScenario$.next(scenario);
  }

  getCurrentPlan(): Plan | null {
    return this._currentPlan$.value;
  }

  getCurrentScenario(): Scenario | null {
    return this._currentScenario$.value;
  }

  getCurrentPlanId(): number {
    const plan = this.getCurrentPlan();
    if (!plan) {
      throw new Error('no plan!');
    }
    return plan.id;
  }

  getScenarioId() {
    const scenario = this.getCurrentScenario();
    if (!scenario) {
      throw new Error('no scenario!');
    }
    return scenario.id;
  }
}
