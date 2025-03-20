import { Component } from '@angular/core';

import { TreatmentsState } from '../treatments.state';
import { distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { TreatmentSummary } from '@types';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-acres-treated',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './acres-treated.component.html',
  styleUrl: './acres-treated.component.scss',
})
export class AcresTreatedComponent {
  summary$ = this.treatmentsState.summary$.pipe(
    filter((ts): ts is TreatmentSummary => !!ts)
  );

  totals$ = this.treatmentsState.activeProjectArea$.pipe(
    distinctUntilChanged(),
    switchMap((projectArea) => {
      if (projectArea) {
        return of(projectArea);
      }
      return this.summary$;
    })
  );

  reloading$ = this.treatmentsState.reloadingSummary$;

  constructor(private treatmentsState: TreatmentsState) {}
}
