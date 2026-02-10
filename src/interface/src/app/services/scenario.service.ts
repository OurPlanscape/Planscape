import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable } from 'rxjs';
import {
  AvailableStands,
  Constraint,
  Scenario,
  SCENARIO_TYPE,
  ScenarioV3Payload,
} from '@types';
import { CreateScenarioError } from './errors';
import { environment } from '@env/environment';
import { FeatureService } from '@features/feature.service';

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
  getScenario(scenarioId: number): Observable<Scenario> {
    return this.http.get<Scenario>(this.v2Path + scenarioId + '/', {
      withCredentials: true,
    });
  }

  createScenario(name: string, planId: number, type: SCENARIO_TYPE) {
    const scenarioParameters = {
      name: name,
      planning_area: planId,
      type: type,
    };
    return this.http.post<Scenario>(
      this.v2Path + 'draft/',
      scenarioParameters,
      {
        withCredentials: true,
      }
    );
  }

  /** Actually runs the draft scenario after it's been configured */
  runScenario(scenarioId: number) {
    const runUrl = `${this.v2Path}${scenarioId}/run/`;
    return this.http.post<Scenario>(
      runUrl,
      {},
      {
        withCredentials: true,
      }
    );
  }

  /** Makes a request to the backend to rename the scenario with the given name */
  editScenarioName(
    scenarioId: number,
    name: string,
    planning_area: number
  ): Observable<any> {
    return this.http.patch(
      this.v2Path + scenarioId + '/',
      { name, planning_area },
      { withCredentials: true }
    );
  }

  //sends a partial scenario configuration using PATCH
  // returns success or failure, based on backend results
  patchScenarioConfig(
    scenarioId: number,
    configPayload: Partial<ScenarioV3Payload>
  ) {
    return this.http
      .patch<Scenario>(this.v2Path + scenarioId + '/draft/', configPayload, {
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          if (
            this.featureService.isFeatureEnabled('CUSTOM_EXCEPTION_HANDLER')
          ) {
            const message =
              error.error.errors?.global?.[0] || 'Failed to save configuration';
            throw new CreateScenarioError(
              'Scenario Config is invalid. ' + message
            );
          } else {
            const message =
              error.error?.global?.[0] || 'Failed to save configuration';
            throw new CreateScenarioError(
              'Scenario Config is invalid. ' + message
            );
          }
        })
      );
  }

  toggleScenarioStatus(scenarioId: number) {
    const url = this.v2Path + scenarioId + '/toggle_status/';
    return this.http.post<number>(url, {
      withCredentials: true,
    });
  }

  deleteScenario(scenarioId: number) {
    return this.http.delete<void>(`${this.v2Path}${scenarioId}/`, {
      withCredentials: true,
    });
  }

  downloadCsvData(scenarioId: number): Observable<any> {
    return this.http.get(
      environment.backend_endpoint +
        `/planning/get_scenario_download_by_id?id=${scenarioId}`,
      {
        withCredentials: true,
        responseType: 'arraybuffer',
      }
    );
  }

  downloadGeopackage(geoPackageUrl: string): Observable<any> {
    return this.http.get(geoPackageUrl, {
      responseType: 'arraybuffer',
    });
  }

  downloadShapeFiles(scenarioId: number): Observable<any> {
    return this.http.get(
      environment.backend_endpoint +
        `/planning/download_shapefile?id=${scenarioId}`,
      {
        withCredentials: true,
        responseType: 'arraybuffer',
      }
    );
  }

  getExcludedStands(
    planId: number,
    stand_size: string,
    excludes?: number[],
    constraints?: Constraint[]
  ) {
    const url =
      environment.backend_endpoint +
      `/v2/planningareas/${planId}/available_stands/`;
    return this.http.post<AvailableStands>(
      url,
      {
        stand_size,
        excludes,
        constraints,
      },
      {
        withCredentials: true,
      }
    );
  }
}
