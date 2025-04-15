import { Injectable } from '@angular/core';
import {
  Region,
  regionToString,
  ScenarioGoal,
  TreatmentGoalConfig,
} from '@types';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TreatmentGoalsService {
  constructor(private http: HttpClient) {}

  private _cachedStatewideGoals: ScenarioGoal[] | null = null;

  getLegacyTreatmentGoalsForArea(region: Region) {
    return this.http.get<TreatmentGoalConfig[]>(
      environment.backend_endpoint +
        '/planning/treatment_goals_config/?region_name=' +
        `${regionToString(region)}`
    );
  }

  getTreatmentGoals() {
    if (this._cachedStatewideGoals) {
      return of(this._cachedStatewideGoals);
    }
    return this.http
      .get<
        ScenarioGoal[]
      >(environment.backend_endpoint + '/v2/treatment-goals/')
      .pipe(tap((c) => (this._cachedStatewideGoals = c)));
  }
}
