import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
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

import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { MatMenuModule } from '@angular/material/menu';
import { TreatmentNavbarMenuComponent } from '../treatment-navbar-menu/treatment-navbar-menu.component';
import { ApplyTreatmentComponent } from '../apply-treatment/apply-treatment.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { MatLegacySlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { TreatmentRoutingData } from '../treatments-routing.module';
import { MatDialog } from '@angular/material/dialog';
import { ReviewTreatmentPlanDialogComponent } from '../review-treatment-plan-dialog/review-treatment-plan-dialog.component';

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
    MatLegacySlideToggleModule,
    MatIconModule,
    MatLegacyButtonModule,
    MatMenuModule,
    TreatmentNavbarMenuComponent,
    ApplyTreatmentComponent,
    TreatmentLegendComponent,
    RouterLink,
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
  projectAreaId$ = this.treatmentsState.projectAreaId$;
  summary$ = this.treatmentsState.summary$;
  treatmentPlanName$ = this.summary$.pipe(map((s) => s?.treatment_plan_name));
  showApplyTreatments$ = this.treatmentsState.showApplyTreatmentsDialog$;
  showTreatmentLayer$ = this.mapConfig.showTreatmentStandsLayer$;
  showTreatmentLegend$ = combineLatest([
    this.treatmentsState.projectAreaId$.pipe(map((activeArea) => !!activeArea)),
    this.showTreatmentLayer$,
  ]).pipe(
    map(([activeArea, showTreatmentLayer]) => !activeArea && showTreatmentLayer)
  );

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

  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfig: MapConfigState,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private injector: Injector // Angular's injector for passing shared services
  ) {
    this.router.events
      .pipe(
        untilDestroyed(this),
        filter((event) => event instanceof NavigationEnd) // Only react to navigation events
      )
      .subscribe(() => {
        const data = getMergedRouteData(this.route.snapshot);
        this.treatmentsState
          .loadTreatmentByRouteData(data)
          .pipe(this.catchError())
          .subscribe();
      });
  }

  redirectToScenario() {
    const summary = this.treatmentsState.getCurrentSummary();
    let url = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}`;
    this.router.navigate([url]);
  }

  redirectToNewPlan(planId: number) {
    const summary = this.treatmentsState.getCurrentSummary();
    let url = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}/treatment/${planId}`;
    this.router.navigate([url]);
  }

  toggleShowTreatmentLayers() {
    this.mapConfig.toggleShowTreatmentStands();
  }

  showReviewDialog() {
    this.dialog.open(ReviewTreatmentPlanDialogComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }

  private catchError() {
    return catchError((error) => {
      this.router.navigate(['/']);
      throw error;
    });
  }
}

export function getMergedRouteData(
  route: ActivatedRouteSnapshot
): TreatmentRoutingData {
  const parentData = route.parent?.data || {};
  const childData = route.firstChild?.data || {};
  const currentData = route.data || {};

  return {
    ...parentData,
    ...childData,
    ...currentData,
  } as TreatmentRoutingData;
}
