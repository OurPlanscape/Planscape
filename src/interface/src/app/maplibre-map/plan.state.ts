import { Injectable } from '@angular/core';
import { Plan } from '@types';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlanState {
  /**
   * Our current plan. It should reflect the selected plan
   */
  private _currentPlan = new BehaviorSubject<Plan | null>(null);
  currentPlan$ = this._currentPlan.asObservable();

  setCurrentPlan(plan: Plan) {
    this._currentPlan.next(plan);
  }
}
