import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ClimateForesightRun, CreateClimateForesightRunPayload } from '@types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClimateForesightService {
  readonly basePath =
    environment.backend_endpoint + '/v2/climate-foresight-runs/';

  constructor(private http: HttpClient) {}

  /**
   * Create a new climate foresight run
   */
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
  listRuns(): Observable<ClimateForesightRun[]> {
    return this.http.get<ClimateForesightRun[]>(this.basePath, {
      withCredentials: true,
    });
  }

  /**
   * List climate foresight runs for a specific planning area
   */
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
  getRun(id: number): Observable<ClimateForesightRun> {
    return this.http.get<ClimateForesightRun>(`${this.basePath}${id}/`, {
      withCredentials: true,
    });
  }

  /**
   * Delete a climate foresight run
   */
  deleteRun(id: number): Observable<void> {
    return this.http.delete<void>(`${this.basePath}${id}/`, {
      withCredentials: true,
    });
  }
}
