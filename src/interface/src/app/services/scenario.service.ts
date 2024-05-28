import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, take } from 'rxjs';
import { Scenario, SCENARIO_STATUS, ScenarioConfig } from '@types';
import { CreateScenarioError } from './errors';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ScenarioService {
  constructor(private http: HttpClient) {}

  /** Fetches the scenarios for a plan from the backend. */
  getScenariosForPlan(planId: number): Observable<Scenario[]> {
    return this.http.get<Scenario[]>(
      environment.backend_endpoint.concat(
        `/planning/list_scenarios_for_planning_area/?planning_area=${planId}`
      ),
      {
        withCredentials: true,
      }
    );
  }

  // TODO Add boolean parameter to control if show_results flag is true or false
  /** Fetches a scenario by its id from the backend. */
  getScenario(scenarioId: string): Observable<Scenario> {
    const url = environment.backend_endpoint.concat(
      '/planning/get_scenario_by_id/?id=',
      scenarioId
    );
    return this.http.get<Scenario>(url, {
      withCredentials: true,
    });
  }

  /** Creates a scenario in the backend. Returns scenario ID. */
  createScenario(scenarioParameters: any): Observable<any> {
    scenarioParameters['configuration'] = this.convertConfigToScenario(
      scenarioParameters['configuration']
    );
    return this.http
      .post<{
        id: number;
      }>(
        environment.backend_endpoint + '/planning/create_scenario/',
        scenarioParameters,
        {
          withCredentials: true,
        }
      )
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

  /** Deletes one or more scenarios from the backend. Returns IDs of deleted scenarios. */
  deleteScenarios(scenarioIds: string[]): Observable<string[]> {
    return this.http.post<string[]>(
      environment.backend_endpoint.concat('/planning/delete_scenario/'),
      {
        scenario_id: scenarioIds,
      },
      {
        withCredentials: true,
      }
    );
  }

  toggleScenarioStatus(scenarioId: number, archive: boolean) {
    return this.changeScenarioStatus(
      scenarioId,
      archive ? 'ARCHIVED' : 'ACTIVE'
    );
  }

  private changeScenarioStatus(scenarioId: number, status: SCENARIO_STATUS) {
    const url = environment.backend_endpoint.concat(
      '/planning/update_scenario/'
    );
    return this.http.patch<number>(
      url,
      {
        id: scenarioId,
        status: status,
      },
      {
        withCredentials: true,
      }
    );
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
