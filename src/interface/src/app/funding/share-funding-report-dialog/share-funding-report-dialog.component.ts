import { CommonModule } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  catchError,
  map,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { FlameLengthInterval, FundingReportShareInfo } from '@types';
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

  /** Current share state (already-invited emails + public link) for this config. */
  private shareInfo$ = this.reload$.pipe(
    switchMap(() =>
      this.fundingReportService
        .getReportShareInfo(
          this.data.scenarioId,
          this.data.aet,
          this.data.totalFlameSeverity
        )
        .pipe(
          catchError(() =>
            of({ emails: [], public_url: '' } as FundingReportShareInfo)
          )
        )
    )
  );

  /** Emails the report has already been shared with. */
  people$ = this.shareInfo$.pipe(
    map((info) => info.emails),
    tap(() => (this.isLoading = false))
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
    this.shareInfo$.pipe(take(1)).subscribe((info) => {
      if (!info.public_url) {
        this.showSnackbar('The link is not available yet. Please try again.');
        return;
      }
      this.clipboard.copy(info.public_url);
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
