import { Injectable } from '@angular/core';
import { ScenarioGoal } from '@types';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class TreatmentGoalsService {
  constructor(private http: HttpClient) {}

  getTreatmentGoals(planning_area?: number) {
    return this.http.get<ScenarioGoal[]>(
      `${environment.backend_endpoint ?? ''}/v2/treatment-goals/${planning_area ? '?planning_area=' + planning_area : ''}`
    );
  }
}
