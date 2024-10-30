import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { SharedModule } from '@shared';

import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, switchMap } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { getMergedRouteData } from '../treatments-routing-data';

@Component({
  selector: 'app-direct-impacts',
  standalone: true,
  imports: [AsyncPipe, SharedModule],
  providers: [
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
  ],
  templateUrl: './direct-impacts.component.html',
  styleUrl: './direct-impacts.component.scss',
})
export class DirectImpactsComponent {
  constructor(
    private treatmentsState: TreatmentsState,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const data = getMergedRouteData(this.route.snapshot);
    this.treatmentsState
      .loadTreatmentByRouteData(data)
      .pipe(
        switchMap((_) => this.treatmentsState.treatmentPlan$),
        map((plan) => {
          // if plan is not completed, redirect to config
          if (plan?.status !== 'SUCCESS') {
            this.router.navigate(['../'], { relativeTo: this.route });
          }
        }),
        catchError((error) => {
          this.router.navigate(['/']);
          throw error;
        })
      )
      .subscribe();
  }

  breadcrumbs$ = this.treatmentsState.breadcrumbs$;
}
