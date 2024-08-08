import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, take } from 'rxjs';
import { Scenario, ScenarioConfig } from '@types';
import { CreateScenarioError } from './errors';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ScenarioService {
  readonly v2Path = environment.backend_endpoint + '/v2/scenarios/';

  constructor(private http: HttpClient) {}

  /** Fetches the scenarios for a plan from the backend. */
  getScenariosForPlan(planId: number): Observable<Scenario[]> {
    return this.http.get<Scenario[]>(this.v2Path, {
      withCredentials: true,
      params: {
        planning_area: planId,
      },
    });
  }

  /** Fetches a scenario by its id from the backend. */
  getScenario(scenarioId: string): Observable<Scenario> {
    return this.http.get<Scenario>(this.v2Path + scenarioId, {
      withCredentials: true,
    });
  }

  /** Creates a scenario in the backend. Returns scenario ID. */
  createScenario(scenarioParameters: any): Observable<Scenario> {
    scenarioParameters['configuration'] = this.convertConfigToScenario(
      scenarioParameters['configuration']
    );
    return this.http
      .post<Scenario>(this.v2Path, scenarioParameters, {
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          const message =
            error.error?.global?.[0] ||
            'Please change your settings and try again.';
          throw new CreateScenarioError(
            'Your scenario config is invalid. ' + message
          );
        })
      );
  }

  toggleScenarioStatus(scenarioId: number) {
    const url = this.v2Path + scenarioId + '/toggle_status/';
    return this.http.post<number>(url, {
      withCredentials: true,
    });
  }

  /** Updates a scenario with new notes. */
  updateScenarioNotes(scenario: Scenario): Observable<number> {
    const url = environment.backend_endpoint.concat(
      '/planning/update_scenario/'
    );
    return this.http
      .patch<number>(
        url,
        {
          id: scenario.id,
          notes: scenario.notes,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(take(1));
  }

  downloadCsvData(scenarioId: string): Observable<any> {
    return this.http.get(
      environment.backend_endpoint +
        `/planning/get_scenario_download_by_id?id=${scenarioId}`,
      {
        withCredentials: true,
        responseType: 'arraybuffer',
      }
    );
  }

  downloadShapeFiles(scenarioId: string): Observable<any> {
    return this.http.get(
      environment.backend_endpoint +
        `/planning/download_shapefile?id=${scenarioId}`,
      {
        withCredentials: true,
        responseType: 'arraybuffer',
      }
    );
  }

  private convertConfigToScenario(config: ScenarioConfig): any {
    return {
      question_id: config.treatment_question!.id,
      est_cost: config.est_cost,
      max_budget: config.max_budget,
      min_distance_from_road: config.min_distance_from_road,
      max_slope: config.max_slope,
      max_treatment_area_ratio: config.max_treatment_area_ratio,
      scenario_priorities: config.treatment_question!['scenario_priorities'],
      scenario_output_fields:
        config.treatment_question!['scenario_output_fields_paths']!['metrics'],
      stand_thresholds: config.treatment_question!['stand_thresholds'],
      global_thresholds: config.treatment_question!['global_thresholds'],
      weights: config.treatment_question!['weights'],
      excluded_areas: config.excluded_areas,
      stand_size: config.stand_size,
    };
  }
}
