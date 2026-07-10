import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import {
  FlameLengthInterval,
  FundingReport,
  FundingReportAETSummary,
  FundingReportShareInfo,
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

  /**
   * Recalculate the water availability (AET improvement) metric for a target
   * percentage increase. Returns only the water portion so the caller can patch
   * it into the report.
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

  /**
   * Fetch the emails the report has already been shared with plus the public
   * link for the given report configuration (water % + flame interval).
   */
  getReportShareInfo(
    scenarioId: number,
    aet: number,
    totalFlameSeverity: FlameLengthInterval
  ): Observable<FundingReportShareInfo> {
    return this.http.get<FundingReportShareInfo>(
      environment.backend_endpoint +
        `/v2/scenarios/${scenarioId}/funding-report-invites-shared-link/`,
      {
        params: {
          aet: aet,
          total_flame_severity: totalFlameSeverity,
        },
        withCredentials: true,
      }
    );
  }

  /**
   * Create funding-report invites for the given emails and return the emails
   * the report has now been shared with plus the public link.
   */
  shareReport(
    scenarioId: number,
    emails: string[],
    aet: number,
    totalFlameSeverity: FlameLengthInterval
  ): Observable<FundingReportShareInfo> {
    return this.http.post<FundingReportShareInfo>(
      environment.backend_endpoint +
        `/v2/scenarios/${scenarioId}/funding-report-invites/`,
      {
        emails,
        aet,
        total_flame_severity: totalFlameSeverity,
      },
      {
        withCredentials: true,
      }
    );
  }
}
