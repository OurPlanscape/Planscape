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
import { catchError, combineLatest, map } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AsyncPipe, NgIf } from '@angular/common';
import { FeaturesModule } from '../../features/features.module';
import { SharedModule } from '@shared';

import { ButtonComponent } from '@styleguide';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@UntilDestroy()
@Component({
  selector: 'app-treatment-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    TreatmentMapComponent,
    AsyncPipe,
    NgIf,
    FeaturesModule,
    SharedModule,
    ButtonComponent,
    MatSlideToggleModule,
  ],
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
  activeProjectArea$ = this.treatmentsState.activeProjectArea$;
  summary$ = this.treatmentsState.summary$;

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
          this.treatmentsState.setInitialState({
            treatmentId: data['treatmentId'],
            scenarioId: data['scenarioId'],
            projectAreaId: projectAreaId,
          });

          // update config on map, based on route data
          this.mapConfig.updateShowProjectAreas(data['showMapProjectAreas']);
          this.mapConfig.updateShowTreatmentStands(data['showTreatmentStands']);
          this.mapConfig.setStandSelectionEnabled(data['showTreatmentStands']);
          this.mapConfig.setShowMapControls(data['showMapControls']);

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

  breadcrumbs$ = combineLatest([this.activeProjectArea$, this.summary$]).pipe(
    map(([projectArea, summary]) => {
      if (!summary) {
        return [];
      }
      const crumbs = [
        {
          name: summary.planning_area_name,
          path: `/plan/${summary.planning_area_id}`,
        },
        {
          name: summary.scenario_name,
          path: `/plan/${summary.planning_area_id}/config/${summary.scenario_id}`,
        },
        {
          name: summary.treatment_plan_name,
          path: projectArea
            ? `/plan/${summary.planning_area_id}/config/${summary.scenario_id}/treatment/${summary.treatment_plan_id}`
            : '',
        },
      ];
      if (projectArea) {
        crumbs.push({
          name: projectArea.project_area_name,
          path: '',
        });
      }
      return crumbs;
    })
  );

  goBack() {
    const summary = this.treatmentsState.getCurrentSummary();
    if (summary) {
      let url = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}`;
      if (this.treatmentsState.getProjectAreaId()) {
        url = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}/treatment/${summary.treatment_plan_id}`;
      }
      this.router.navigate([url]);
    }
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
