import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  ViewChild,
} from '@angular/core';

import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';

import { filter } from 'rxjs/operators';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { catchError, map, switchMap } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
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
import { MatDialog } from '@angular/material/dialog';
import { ReviewTreatmentPlanDialogComponent } from '../review-treatment-plan-dialog/review-treatment-plan-dialog.component';
import { getMergedRouteData } from '../treatments-routing-data';
import { TreatmentToPDFService } from '../treatment-to-pdf.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OverlayLoaderComponent } from '../../../styleguide/overlay-loader/overlay-loader.component';
import { canRunTreatmentAnalysis } from '../../plan/permissions';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnalyticsService } from '@services/analytics.service';
import { PlanState } from '../../maplibre-map/plan.state';

@UntilDestroy()
@Component({
  selector: 'app-treatment-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    TreatmentMapComponent,
    AsyncPipe,
    NgIf,
    NgFor,
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
    MatProgressSpinnerModule,
    OverlayLoaderComponent,
    ControlComponent,
    MatTooltipModule,
  ],
  providers: [
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
    TreatmentToPDFService,
  ],
  templateUrl: './treatment-config.component.html',
  styleUrl: './treatment-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentConfigComponent {
  projectAreaId$ = this.treatmentsState.projectAreaId$;

  summary$ = this.treatmentsState.summary$;
  treatmentPlanName$ = this.summary$.pipe(map((s) => s?.treatment_plan_name));
  showApplyTreatments$ = this.treatmentsState.showApplyTreatmentsDialog$;

  showTreatmentLegend$ = this.mapConfig.showTreatmentLegend$;
  @ViewChild(TreatmentMapComponent) mapElement: any;
  navState$ = this.treatmentsState.navState$;

  $navBarArea$ = this.projectAreaId$.pipe(
    map((id) => (id ? 'TREATMENTS_PROJECT_AREA' : 'TREATMENTS'))
  );

  loading = true;

  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfig: MapConfigState,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private pdfService: TreatmentToPDFService,
    private injector: Injector, // Angular's injector for passing shared services
    private analiticsService: AnalyticsService,
    private planState: PlanState
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
          .pipe(
            switchMap((_) => this.treatmentsState.treatmentPlan$),
            map((plan) => {
              // if plan is completed redirect to impacts
              if (plan?.status === 'SUCCESS') {
                this.router.navigate(['impacts'], { relativeTo: this.route });
              }
            }),
            catchError((error) => {
              this.router.navigate(['/']);
              throw error;
            })
          )
          .subscribe((_) => (this.loading = false));
      });
  }

  getMapAttributions() {
    const attrElement = document.querySelector('.maplibregl-ctrl-attrib-inner');
    return Array.from(attrElement?.childNodes || [])
      .map((node) => node.textContent?.trim())
      .filter((text) => text) // Remove any empty strings
      .join(' ');
  }

  createPDF() {
    const mapAttributions = this.getMapAttributions();
    this.pdfService.createPDF(this.mapElement.mapLibreMap, mapAttributions);
  }

  canRunTreatment$ = this.planState.currentPlanResource$.pipe(
    // Skip over loading states
    filter((resource) => !resource.isLoading),

    // if errors, redirect
    map((resource) => {
      if (resource.error) {
        this.router.navigate(['/']);
        return false;
      }
      return resource.data ? canRunTreatmentAnalysis(resource.data) : false;
    })
  );

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
    this.analiticsService.emitEvent(
      'run_treatment_analysis',
      'treatment_plan_page',
      'Run Treatment Analysis'
    );
    this.dialog.open(ReviewTreatmentPlanDialogComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }
}
