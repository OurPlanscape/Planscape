import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable } from 'rxjs';
import {
  AvailableStands,
  Constraint,
  Scenario,
  ScenarioCreationPayload,
  ScenarioDraftPayload,
} from '@types';
import { CreateScenarioError } from './errors';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ScenarioService {
  readonly v2Path = environment.backend_endpoint + '/v2/scenarios/';

  constructor(private http: HttpClient) {}

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

  createScenarioFromName(name: string, planId: number) {
    const scenarioParameters = { name: name, planning_area: planId };
    return this.http.post<Scenario>(this.v2Path, scenarioParameters, {
      withCredentials: true,
    });
  }

  runScenario(scenarioId : number) {
    // actually run the scenario
    const runUrl = `${this.v2Path}${scenarioId}/run/`;
    return this.http
      .post<Scenario>(runUrl, {}, {
        withCredentials: true,
      });
  }

  /** Creates a scenario in the backend with stepper Returns scenario ID. */
  createScenarioFromSteps(
    scenarioParameters: ScenarioCreationPayload
  ): Observable<Scenario> {
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

  //sends a partial scenario configuration using PATCH
  // returns success or failure, based on backend results
  // TODO: assumes the scenario endpoint, so review
  patchScenarioConfig(scenarioId : number, configPayload: Partial<ScenarioDraftPayload>) {
    // was using this: this.v2Path
    return this.http
      .patch<Scenario>(this.v2Path + scenarioId, configPayload, {
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          const message =
            error.error?.global?.[0] || 'Failed to save configuration';
          throw new CreateScenarioError(
            'Scenario Config is invalid. ' + message
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
