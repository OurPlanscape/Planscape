import { Component } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';
import { TreatmentsState } from '../treatments.state';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { filter } from 'rxjs/operators';
import { TreatmentSummary } from '@types';

@Component({
  selector: 'app-review-treatment-plan-dialog',
  standalone: true,
  imports: [ModalComponent, MatSlideToggleModule, NgForOf, AsyncPipe, NgIf],
  templateUrl: './review-treatment-plan-dialog.component.html',
  styleUrl: './review-treatment-plan-dialog.component.scss',
})
export class ReviewTreatmentPlanDialogComponent {
  private showOnlyAreasWithNoTreatment$ = new BehaviorSubject(false);

  constructor(
    private dialogRef: MatDialogRef<ReviewTreatmentPlanDialogComponent>,
    private treatmentsState: TreatmentsState
  ) {}

  projectAreas$: Observable<
    {
      name: string;
      totalStands: number;
      treatedStands: number;
    }[]
  > = this.treatmentsState.summary$.pipe(
    filter((summary): summary is TreatmentSummary => !!summary),
    map((summary) =>
      summary.project_areas.map((projectArea) => {
        return {
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
    // TODO yey message and ney message
    this.treatmentsState.runTreatmentPlan().subscribe();
  }

  toggleShowTreatments() {
    this.showOnlyAreasWithNoTreatment$.next(
      !this.showOnlyAreasWithNoTreatment$.value
    );
  }
}
