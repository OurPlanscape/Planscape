import { CommonModule } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  catchError,
  defer,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { FlameLengthInterval } from '@types';
import { SNACK_BOTTOM_NOTICE_CONFIG } from '@shared';
import { FundingReportService } from '@services/funding-report.service';
import {
  ShareDialogComponent,
  SharePrimaryEvent,
} from '@styleguide/share-dialog/share-dialog.component';

export interface ShareFundingReportDialogData {
  scenarioId: number;
  /** Report/scenario name shown in the dialog title. */
  name: string;
  /** Selected water-availability target (%) — part of the shared link config. */
  aet: number;
  /** Selected flame-length interval — part of the shared link config. */
  totalFlameSeverity: FlameLengthInterval;
}

@Component({
  selector: 'app-share-funding-report-dialog',
  standalone: true,
  imports: [CommonModule, ShareDialogComponent],
  templateUrl: './share-funding-report-dialog.component.html',
})
export class ShareFundingReportDialogComponent {
  constructor(
    private matSnackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ShareFundingReportDialogComponent>,
    private fundingReportService: FundingReportService,
    private clipboard: Clipboard,
    @Inject(MAT_DIALOG_DATA)
    public data: ShareFundingReportDialogData
  ) {}

  emails: string[] = [];
  submitting = false;
  isLoading = true;

  private reload$ = new BehaviorSubject<void>(undefined);

  /** Emails the report has already been shared with. */
  people$ = this.reload$.pipe(
    switchMap(() =>
      this.fundingReportService
        .getInviteEmails(this.data.scenarioId)
        .pipe(catchError(() => of({ emails: [] })))
    ),
    map((info) => info.emails),
    tap(() => (this.isLoading = false))
  );

  /** Public link for the current report configuration. */
  private publicUrl$ = defer(() =>
    this.fundingReportService.getPublicUrl(
      this.data.scenarioId,
      this.data.aet,
      this.data.totalFlameSeverity
    )
  ).pipe(
    map((info) => info.public_url),
    catchError(() => of('')),
    shareReplay(1)
  );

  get title(): string {
    return `Send "${this.data.name}" Summary Link`;
  }

  onPrimary(event: SharePrimaryEvent): void {
    if (event.emails.length === 0) {
      return;
    }
    this.submitting = true;
    this.fundingReportService
      .shareReport(
        this.data.scenarioId,
        event.emails,
        this.data.aet,
        this.data.totalFlameSeverity
      )
      .subscribe({
        next: () => {
          this.showSnackbar('Report summary link sent');
          this.submitting = false;
          this.emails = [];
          this.reload$.next();
        },
        error: () => {
          this.showSnackbar(
            'There was an error trying to send the report link. Please try again.'
          );
          this.submitting = false;
        },
      });
  }

  copyLink(): void {
    this.publicUrl$.pipe(take(1)).subscribe((url) => {
      if (!url) {
        this.showSnackbar('The link is not available yet. Please try again.');
        return;
      }
      this.clipboard.copy(url);
      this.showSnackbar('Link copied');
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  private showSnackbar(message: string) {
    this.matSnackBar.open(message, 'Dismiss', SNACK_BOTTOM_NOTICE_CONFIG);
  }
}
