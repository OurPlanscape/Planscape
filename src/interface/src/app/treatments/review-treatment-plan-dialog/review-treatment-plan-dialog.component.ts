import { Component } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TreatmentsState } from '../treatments.state';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { filter } from 'rxjs/operators';
import { TreatmentSummary } from '@types';

import { DialogData } from '../../../styleguide/dialogs/dialogs';
import { ErrorDialogComponent } from '../../../styleguide/dialogs/error-dialog/error-dialog.component';
import { PendingDialogComponent } from '../../../styleguide/dialogs/pending-dialog/pending-dialog.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-review-treatment-plan-dialog',
  standalone: true,
  imports: [
    ModalComponent,
    MatSlideToggleModule,
    NgForOf,
    AsyncPipe,
    NgIf,
    RouterLink,
  ],
  templateUrl: './review-treatment-plan-dialog.component.html',
  styleUrl: './review-treatment-plan-dialog.component.scss',
})
export class ReviewTreatmentPlanDialogComponent {
  private showOnlyAreasWithNoTreatment$ = new BehaviorSubject(false);

  submitting = false;

  constructor(
    private dialogRef: MatDialogRef<ReviewTreatmentPlanDialogComponent>,
    private dialog: MatDialog,
    private treatmentsState: TreatmentsState,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  projectAreas$: Observable<
    {
      id: number;
      name: string;
      totalStands: number;
      treatedStands: number;
    }[]
  > = this.treatmentsState.summary$.pipe(
    filter((summary): summary is TreatmentSummary => !!summary),
    map((summary) =>
      summary.project_areas.map((projectArea) => {
        return {
          id: projectArea.project_area_id,
          name: projectArea.project_area_name,
          totalStands: projectArea.total_stand_count,
          treatedStands: projectArea.prescriptions
            .map((record) => record.treated_stand_count)
            .reduce((acc, count) => acc + count, 0),
        };
      })
    )
  );

  filteredProjectAreas$ = combineLatest([
    this.projectAreas$,
    this.showOnlyAreasWithNoTreatment$,
  ]).pipe(
    map(([projectAreas, onlyNoTreatments]) => {
      if (onlyNoTreatments) {
        return projectAreas.filter((data) => !data.treatedStands);
      } else {
        return projectAreas;
      }
    })
  );

  standTotals$ = this.projectAreas$.pipe(
    map((totals) =>
      totals.reduce(
        (acc, curr) => ({
          totalStands: acc.totalStands + curr.totalStands,
          treatedStands: acc.treatedStands + curr.treatedStands,
        }),
        { totalStands: 0, treatedStands: 0 }
      )
    )
  );

  cancel(): void {
    this.dialogRef.close(false);
  }

  runTreatmentPlan(): void {
    this.submitting = true;
    this.treatmentsState.runTreatmentPlan().subscribe({
      error: () => {
        this.dialogRef.close();
        this.dialog
          .open<ErrorDialogComponent, DialogData>(ErrorDialogComponent, {
            data: {
              primaryButtonText: 'Try Again',
              headline: 'Unable to create your treatment plan',
              message:
                'There was an error while creating the treatment plan. Please check your internet connection and try again.',
            },
          })
          .afterClosed()
          .subscribe((confirm) => {
            if (confirm) {
              this.runTreatmentPlan();
            }
          });
      },
      next: () => {
        this.dialogRef.close();
        this.router.navigate(['../..'], { relativeTo: this.route });
        this.dialog
          .open<PendingDialogComponent, DialogData>(PendingDialogComponent, {
            data: {
              primaryButtonText: 'Go to Planning Area',
              secondaryButtonText: 'Close',
              headline: 'Planscape is creating your treatment plan',
              message:
                'This may take up to 1 hour. You will receive an email when the treatment plan is created.',
            },
          })
          .afterClosed()
          .subscribe((confirm) => {
            if (confirm) {
              this.router.navigate(['../../../..'], { relativeTo: this.route });
            }
          });
      },
    });
  }

  toggleShowTreatments() {
    this.showOnlyAreasWithNoTreatment$.next(
      !this.showOnlyAreasWithNoTreatment$.value
    );
  }
}
