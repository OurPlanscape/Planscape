import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ClimateForesightRun,
  CreateClimateForesightRunPayload,
  DataLayer,
  GeoPackageDownloadResponse,
  Pillar,
} from '@types';
import { environment } from '@env/environment';

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

  /**
   * Copy a climate foresight run
   */
  copyRun(id: number, name: string): Observable<ClimateForesightRun> {
    return this.http.post<ClimateForesightRun>(
      `${this.basePath}${id}/copy/`,
      { name },
      { withCredentials: true }
    );
  }

  /**
   * Get data layers available for climate foresight analysis
   */
  getDataLayers(): Observable<DataLayer[]> {
    return this.http.get<DataLayer[]>(`${this.basePath}datalayers/`, {
      withCredentials: true,
    });
  }

  /**
   * Get the list of pillars
   */
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

  deletePillar(id: number, run_id: number) {
    return this.http.delete(`${this.pillarsPath}-pillars/${id}?run=${run_id}`, {
      withCredentials: true,
    });
  }

  /**
   * Update a climate foresight run (partial update)
   */
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

  /**
   * Trigger the analysis pipeline for a climate foresight run
   * This will start the normalization, pillar rollup, landscape rollup, and PROMOTe tasks
   */
  runAnalysis(id: number): Observable<ClimateForesightRun> {
    return this.http.post<ClimateForesightRun>(
      `${this.basePath}${id}/run_analysis/`,
      {},
      {
        withCredentials: true,
      }
    );
  }

  /**
   * Get the download status and URL for Climate Foresight outputs
   */
  getDownloadStatus(id: number): Observable<GeoPackageDownloadResponse> {
    return this.http.get<GeoPackageDownloadResponse>(
      `${this.basePath}${id}/download/`,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * Download a file from a signed URL
   */
  downloadFromUrl(url: string): Observable<Blob> {
    return this.http.get(url, {
      responseType: 'blob',
    });
  }
}
