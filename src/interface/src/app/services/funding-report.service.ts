import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import {
  FlameLengthReductionResponse,
  FlameLengthRequestParams,
  FundingReport,
  FundingReportAETSummary,
} from '@types';
import { catchError, Observable, of, throwError } from 'rxjs';

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
   * Recalculate the water availability (AET improvement) metric for a target
   * percentage increase. Mirrors `getFlameLengthReduction`: returns only the
   * water portion so the caller can patch it into the report.
   */
  getWaterAvailability(
    scenarioId: number,
    percentage: number
  ): Observable<FundingReportAETSummary> {
    return this.http.post<FundingReportAETSummary>(
      environment.backend_endpoint +
        `/v2/scenarios/${scenarioId}/aet-improvement/`,
      { percentage },
      {
        withCredentials: true,
      }
    );
  }
}
