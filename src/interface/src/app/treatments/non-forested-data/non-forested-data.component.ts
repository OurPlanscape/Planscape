import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { distinctUntilChanged, switchMap, tap } from 'rxjs';

import { TreatmentsState } from '../treatments.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgIf } from '@angular/common';
import { TreatmentsService } from '@services/treatments.service';

@UntilDestroy()
@Component({
  selector: 'app-non-forested-data',
  standalone: true,
  imports: [MatTableModule, MatProgressSpinnerModule, NgIf],
  templateUrl: './non-forested-data.component.html',
  styleUrl: './non-forested-data.component.scss',
})
export class NonForestedDataComponent {
  state: 'LOADING' | 'TABLE' | 'NON_BURNABLE' = 'LOADING';

  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService
  ) {
    this.directImpactsStateService.activeStand$
      .pipe(
        untilDestroyed(this),
        distinctUntilChanged((prev, curr) => prev?.id === curr?.id),
        tap((_) => (this.state = 'LOADING')),
        switchMap((s) =>
          this.treatmentsService.getStandResult(
            this.treatmentsState.getTreatmentPlanId(),
            (s?.id as number) || 0
          )
        )
      )
      .subscribe((dataset) => {
        this.state = 'TABLE';
        this.dataSource = dataset.map((data, i) => {
          return {
            time_step: i * 5,
            rate_of_spread: data.ROS.category,
            flame_length: data.FL.category,
          };
        });
        // if any its null mark the area as non-burnable
        if (
          this.dataSource.some(
            (data) =>
              data.rate_of_spread === null || data.rate_of_spread === 'N/A'
          )
        ) {
          this.state = 'NON_BURNABLE';
        }
      });
  }

  get isLoading() {
    return this.state === 'LOADING';
  }

  get showTable() {
    return this.state === 'TABLE';
  }

  get showNonBurnable() {
    return this.state === 'NON_BURNABLE';
  }

  dataSource: {
    time_step: number;
    rate_of_spread: string;
    flame_length: string;
  }[] = [];
  displayedColumns: string[] = ['time_step', 'rate_of_spread', 'flame_length'];
}
