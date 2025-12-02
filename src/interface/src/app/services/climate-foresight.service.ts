import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ClimateForesightRun,
  CreateClimateForesightRunPayload,
  DataLayer,
  Pillar,
} from '@types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClimateForesightService {
  readonly basePath =
    environment.backend_endpoint + '/v2/climate-foresight-runs/';

  readonly pillarsPath = environment.backend_endpoint + '/v2/climate-foresight';

  constructor(private http: HttpClient) {}

  /**
   * Create a new climate foresight run
   */
  // ERROR_SURVEY - passes response up
  createRun(
    payload: CreateClimateForesightRunPayload
  ): Observable<ClimateForesightRun> {
    return this.http.post<ClimateForesightRun>(this.basePath, payload, {
      withCredentials: true,
    });
  }

  /**
   * List all climate foresight runs for the current user
   */
  // ERROR_SURVEY - passes response up -- this function is not used?
  listRuns(): Observable<ClimateForesightRun[]> {
    return this.http.get<ClimateForesightRun[]>(this.basePath, {
      withCredentials: true,
    });
  }

  /**
   * List climate foresight runs for a specific planning area
   */
  // ERROR_SURVEY - passes response up
  listRunsByPlanningArea(
    planningAreaId: number
  ): Observable<ClimateForesightRun[]> {
    return this.http.get<ClimateForesightRun[]>(
      `${this.basePath}by-planning-area/${planningAreaId}/`,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * Get a specific climate foresight run
   */
  // ERROR_SURVEY - passes response up
  getRun(id: number): Observable<ClimateForesightRun> {
    return this.http.get<ClimateForesightRun>(`${this.basePath}${id}/`, {
      withCredentials: true,
    });
  }

  /**
   * Delete a climate foresight run
   */
  // ERROR_SURVEY - passes response up
  deleteRun(id: number): Observable<void> {
    return this.http.delete<void>(`${this.basePath}${id}/`, {
      withCredentials: true,
    });
  }

  /**
   * Get data layers available for climate foresight analysis
   */
  // ERROR_SURVEY - passes response up
  getDataLayers(): Observable<DataLayer[]> {
    return this.http.get<DataLayer[]>(`${this.basePath}datalayers/`, {
      withCredentials: true,
    });
  }

  /**
   * Get the list of pillars
   */
  // ERROR_SURVEY - passes response up
  getPillars(run_id: number): Observable<Pillar[]> {
    return this.http.get<Pillar[]>(
      `${this.pillarsPath}-pillars?run=${run_id}`,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * Create a custom pillar
   */
  // ERROR_SURVEY - passes response up
  createPillar(name: string, runId: number) {
    return this.http.post<Pillar>(
      `${this.pillarsPath}-pillars/`,
      {
        run: runId,
        name,
        order: 0,
      },
      {
        withCredentials: true,
      }
    );
  }

  /**
   * Edit a custom pillar
   */
  // ERROR_SURVEY - passes response up
  editPillar(name: string, pillarId: number, runId: number) {
    return this.http.patch<Pillar>(
      `${this.pillarsPath}-pillars/${pillarId}?run=${runId}`,
      {
        name,
      },
      {
        withCredentials: true,
      }
    );
  }

  // ERROR_SURVEY - passes response up
  deletePillar(id: number, run_id: number) {
    return this.http.delete(`${this.pillarsPath}-pillars/${id}?run=${run_id}`, {
      withCredentials: true,
    });
  }

  /**
   * Update a climate foresight run (partial update)
   */
  // ERROR_SURVEY - passes response up
  updateRun(
    id: number,
    payload: Partial<ClimateForesightRun>
  ): Observable<ClimateForesightRun> {
    return this.http.patch<ClimateForesightRun>(
      `${this.basePath}${id}/`,
      payload,
      {
        withCredentials: true,
      }
    );
  }
}
