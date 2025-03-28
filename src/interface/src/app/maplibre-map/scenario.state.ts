import { Injectable } from '@angular/core';
import { Scenario } from '@types';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlanState {
  /**
   * Our current scenario. It should reflect the selected scenario
   */
  private _currentScenario$ = new BehaviorSubject<Scenario | null>(null);
  currentScenario$ = this._currentScenario$.asObservable();

  setCurrentScenario(scenario: Scenario) {
    this._currentScenario$.next(scenario);
  }
}
