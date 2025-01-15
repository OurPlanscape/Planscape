import { Component } from '@angular/core';

import { AsyncPipe, DecimalPipe, NgIf } from '@angular/common';
import { TreatmentsState } from '../treatments.state';
import { distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { TreatmentSummary } from '@types';

@Component({
  selector: 'app-acres-treated',
  standalone: true,
  imports: [DecimalPipe, AsyncPipe, NgIf],
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

  totalAcres$ = this.totals$.pipe(map((ts) => ts.total_area_acres));
  totalTreatedAcres$ = this.totals$.pipe(
    map((ts) => ts.total_treated_area_acres)
  );

  constructor(private treatmentsState: TreatmentsState) {}
}
