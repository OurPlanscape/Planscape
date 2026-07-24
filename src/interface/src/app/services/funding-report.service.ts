import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import {
  FlameLengthInterval,
  FundingReport,
  FundingReportAETSummary,
  FundingReportInviteEmails,
  FundingReportPublic,
  FundingReportPublicUrl,
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

  /**
   * Fetch a shared funding report by its shared-link UUID. Public / unauthed —
   * no credentials sent. Returns `null` on 404 (link missing, deleted, or
   * report gone).
   */
  getPublicReport(
    sharedLinkUuid: string
  ): Observable<FundingReportPublic | null> {
    return this.http
      .get<FundingReportPublic>(
        environment.backend_endpoint + `/v2/funding_report/${sharedLinkUuid}/`
      )
      .pipe(
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
   * Fetch the emails the report has already been shared with.
   */
  getInviteEmails(scenarioId: number): Observable<FundingReportInviteEmails> {
    return this.http.get<FundingReportInviteEmails>(
      environment.backend_endpoint +
        `/v2/scenarios/${scenarioId}/funding-report-invites/`,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * Fetch the public link for the given report configuration (water % + flame
   * interval).
   */
  getPublicUrl(
    scenarioId: number,
    aet: number,
    totalFlameSeverity: FlameLengthInterval
  ): Observable<FundingReportPublicUrl> {
    return this.http.get<FundingReportPublicUrl>(
      environment.backend_endpoint +
        `/v2/scenarios/${scenarioId}/funding-report-public-url/`,
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
   * the report has now been shared with. When `resendToAllInvitees` is true the
   * link is re-sent to everyone already invited, not just the new emails.
   */
  shareReport(
    scenarioId: number,
    emails: string[],
    aet: number,
    totalFlameSeverity: FlameLengthInterval,
    resendToAllInvitees = false
  ): Observable<FundingReportInviteEmails> {
    return this.http.post<FundingReportInviteEmails>(
      environment.backend_endpoint +
        `/v2/scenarios/${scenarioId}/funding-report-invites/`,
      {
        emails,
        aet,
        total_flame_severity: totalFlameSeverity,
        resent_to_all_invitees: resendToAllInvitees,
      },
      {
        withCredentials: true,
      }
    );
  }
}
