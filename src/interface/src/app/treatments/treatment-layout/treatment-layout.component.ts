import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';
import { filter } from 'rxjs/operators';
import { MapConfigState } from '../treatment-map/map-config.state';
import { catchError } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-treatment-layout',
  standalone: true,
  imports: [RouterOutlet, TreatmentMapComponent],
  providers: [
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
  ],
  templateUrl: './treatment-layout.component.html',
  styleUrl: './treatment-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentLayoutComponent {
  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfig: MapConfigState,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.router.events
      .pipe(
        untilDestroyed(this),
        filter((event) => event instanceof NavigationEnd) // Only react to navigation events
      )
      .subscribe(() => {
        const data = getMergedRouteData(this.route.snapshot);
        const projectAreaId = data['projectAreaId'];

        if (data) {
          this.treatmentsState.setTreatmentPlanId(data['treatmentId']);
          this.treatmentsState.setScenarioId(data['scenarioId']);

          // update config on map, based on route data
          this.mapConfig.updateShowProjectAreas(data['showMapProjectAreas']);
          this.mapConfig.updateShowTreatmentStands(data['showTreatmentStands']);
          this.mapConfig.setStandSelectionEnabled(data['showTreatmentStands']);
          this.mapConfig.setShowMapControls(data['showMapControls']);

          this.treatmentsState.setProjectAreaId(projectAreaId);
          if (projectAreaId) {
            treatmentsState
              .loadSummaryForProjectArea()
              .pipe(this.catchError())
              .subscribe();
          } else {
            treatmentsState.loadSummary().pipe(this.catchError()).subscribe();
          }

          this.treatmentsState
            .loadTreatmentPlan()
            .pipe(this.catchError())
            .subscribe();
        }
      });
  }

  private catchError() {
    return catchError((error) => {
      this.router.navigate(['/']);
      throw error;
    });
  }
}

export function getMergedRouteData(route: ActivatedRouteSnapshot): any {
  const parentData = route.parent?.data || {};
  const childData = route.firstChild?.data || {};
  const currentData = route.data || {};

  return {
    ...parentData,
    ...childData,
    ...currentData,
  };
}
