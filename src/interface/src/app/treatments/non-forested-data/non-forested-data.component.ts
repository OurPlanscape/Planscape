import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs';

import { TreatmentsState } from '../treatments.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CommonModule } from '@angular/common';
import { TreatmentsService } from '@services/treatments.service';
import { standIsNonBurnable } from '../stands';

@UntilDestroy()
@Component({
  selector: 'app-non-forested-data',
  standalone: true,
  imports: [MatTableModule, MatProgressSpinnerModule, CommonModule],
  templateUrl: './non-forested-data.component.html',
  styleUrl: './non-forested-data.component.scss',
})
export class NonForestedDataComponent {
  loading = false;

  standIsNonBurnable$ = this.directImpactsStateService.activeStand$.pipe(
    map((d) => standIsNonBurnable(d))
  );

  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService
  ) {
    this.directImpactsStateService.activeStand$
      .pipe(
        untilDestroyed(this),
        distinctUntilChanged((prev, curr) => prev?.id === curr?.id),
        tap((_) => (this.loading = true)),
        switchMap((s) =>
          this.treatmentsService.getStandResult(
            this.treatmentsState.getTreatmentPlanId(),
            (s?.id as number) || 0
          )
        )
      )
      .subscribe((dataset) => {
        this.loading = false;
        this.dataSource = dataset.map((data, i) => {
          return {
            time_step: i * 5,
            rate_of_spread: data.ROS.category,
            flame_length: data.FL.category,
          };
        });
      });
  }

  dataSource: {
    time_step: number;
    rate_of_spread: string;
    flame_length: string;
  }[] = [];
  displayedColumns: string[] = ['time_step', 'rate_of_spread', 'flame_length'];
}
