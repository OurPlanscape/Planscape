import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import {
  FlameLengthReductionResponse,
  FlameLengthRequestParams,
  FundingReport,
  FundingReportWater,
} from '@types';
import { catchError, map, Observable, of, throwError } from 'rxjs';

/**
 * Placeholder water metric. The backend does not compute this yet, so we patch
 * it into the report locally (in `getReport`) and serve recalculations from
 * `getWaterAvailability`. TODO: remove once the backend returns `results.water`.
 */
const MOCK_WATER: FundingReportWater = {
  percent_of_area: 18,
  acres: 118400,
};

@Injectable({
  providedIn: 'root',
})
export class FundingReportService {
  constructor(private http: HttpClient) {}

  getReport(scenarioId: number): Observable<FundingReport | null> {
    return this.http
      .get<FundingReport>(
        environment.backend_endpoint +
          `/v2/scenarios/${scenarioId}/get-report/`,
        {
          withCredentials: true,
        }
      )
      .pipe(
        // TODO: drop once the backend includes `water` in the report results.
        map((report) =>
          report?.results
            ? {
                ...report,
                results: { ...report.results, water: MOCK_WATER },
              }
            : report
        ),
        // The backend returns 404 when no report exists yet.
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of(null) : throwError(() => error)
        )
      );
  }

  generateReport(scenarioId: number) {
    return this.http.post<FundingReport>(
      environment.backend_endpoint + `/v2/scenarios/${scenarioId}/run-report/`,
      {
        withCredentials: true,
      }
    );
  }

  getFlameLengthReduction(
    scenarioId: number,
    params: FlameLengthRequestParams
  ): Observable<FlameLengthReductionResponse> {
    return this.http.post<FlameLengthReductionResponse>(
      environment.backend_endpoint +
        `/v2/scenarios/${scenarioId}/flame-length-reduction/`,
      { ...params },
      {
        withCredentials: true,
      }
    );
  }

  /**
   * Recalculate the water availability metric for a target percentage increase.
   * Mirrors `getFlameLengthReduction`, but returns only the water portion so the
   * caller can patch it into the report. TODO: the backend has no endpoint yet,
   * so this serves the mocked value.
   */
  getWaterAvailability(
    scenarioId: number,
    increasePercent: number
  ): Observable<FundingReportWater> {
    return of(MOCK_WATER);
  }
}
