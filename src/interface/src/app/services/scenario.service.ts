import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { Scenario, ScenarioConfig } from '@types';
import { CreateScenarioError } from './errors';
import { environment } from '../../environments/environment';
import { FeatureService } from '../features/feature.service';
import { EXCLUDED_AREAS } from '@shared';

@Injectable({
  providedIn: 'root',
})
export class ScenarioService {
  readonly v2Path = environment.backend_endpoint + '/v2/scenarios/';

  constructor(
    private http: HttpClient,
    private featureService: FeatureService
  ) {}

  /** Fetches the scenarios for a plan from the backend.
   *  Includes an optional ordering param
   */
  getScenariosForPlan(
    planId: number,
    ordering?: string
  ): Observable<Scenario[]> {
    const params: any = { planning_area: planId };
    if (ordering !== undefined) {
      params.ordering = ordering;
    }
    return this.http.get<Scenario[]>(this.v2Path, {
      withCredentials: true,
      params: params,
    });
  }

  /** Fetches a scenario by its id from the backend. */
  getScenario(scenarioId: string): Observable<Scenario> {
    return this.http.get<Scenario>(this.v2Path + scenarioId + '/', {
      withCredentials: true,
    });
  }

  /** Creates a scenario in the backend. Returns scenario ID. */
  createScenario(scenarioParameters: any): Observable<Scenario> {
    if (this.featureService.isFeatureEnabled('STATEWIDE_SCENARIOS')) {
      scenarioParameters['configuration'] = this.convertConfigToScenario(
        scenarioParameters['configuration']
      );
    } else {
      scenarioParameters['configuration'] = this.convertConfigToScenarioLegacy(
        scenarioParameters['configuration']
      );
    }
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

  getExcludedAreas(): Observable<{ key: number; label: string; id: number }[]> {
    if (this.featureService.isFeatureEnabled('STATEWIDE_SCENARIOS')) {
      const url = environment.backend_endpoint + '/v2/datasets/998/browse';
      return this.http.get(url).pipe(
        map((areas: any) => {
          const excludedAreas: { key: number; label: string; id: number }[] =
            [];
          areas.forEach((area: any) => {
            excludedAreas.push({
              key: area.id,
              label: area.name,
              id: area.id,
            });
          });
          return excludedAreas;
        })
      );
    }
    return of(EXCLUDED_AREAS as any);
  }

  private convertConfigToScenarioLegacy(config: any): any {
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

  private convertConfigToScenario(config: ScenarioConfig): ScenarioConfig {
    return {
      stand_size: config.stand_size,
      estimated_cost: config.estimated_cost,
      max_budget: config.max_budget, // We should send max_budget OR max_area just 1 of both
      max_area: !config.max_budget && config.max_area ? config.max_area : null, // We should send max_budget OR max_area just 1 of both
      max_project_count: config.max_project_count,
      max_slope: config.max_slope,
      min_distance_from_road: config.min_distance_from_road,
      excluded_areas: config.excluded_areas,
      seed: config.seed,
    };
  }
}
