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
import { Map as MapLibreMap } from 'maplibre-gl';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';

import { filter } from 'rxjs/operators';
import { MapConfigState } from '../treatment-map/map-config.state';
import { catchError, combineLatest, map, switchMap } from 'rxjs';
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
import { PrintableTxFooterComponent } from '../printable-tx-footer/printable-tx-footer.component';

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
    PrintableTxFooterComponent,
  ],
  providers: [
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
  ],
  templateUrl: './treatment-config.component.html',
  styleUrl: './treatment-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentConfigComponent {
  projectAreaId$ = this.treatmentsState.projectAreaId$;
  activeProjectArea$ = this.treatmentsState.activeProjectArea$;
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
  @ViewChild(TreatmentMapComponent) mapElement: any;
  breadcrumbs$ = this.treatmentsState.breadcrumbs$;

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

  async printTreatment() {
    // Create a new div for the printable map
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '100%';
    printContainer.style.height = '100%';
    document.body.appendChild(printContainer);

    // Copy orientation and content of existing map
    const originalMap = this.mapElement.mapLibreMap;
    const printMap = new MapLibreMap({
      container: printContainer,
      style: originalMap.getStyle(),
      center: originalMap.getCenter(),
      zoom: originalMap.getZoom(),
      bearing: originalMap.getBearing(),
      pitch: originalMap.getPitch(),
    });

    // Let map load, then grab canvas as png
    await new Promise((resolve) => printMap.on('load', resolve));
    const canvas = printMap.getCanvas();
    const img = new Image();
    img.src = canvas.toDataURL('image/png');

    // create actual printable element
    const printElement = document.createElement('div');
    printElement.className = 'print-only-map';
    printElement.style.display = 'none';
    printElement.appendChild(img);
    document.body.appendChild(printElement);

    //add styles that must be dynamic
    const style = document.createElement('style');
    style.textContent = `
      @media print {
            .print-only-map {
              display: block !important;
              page-break-inside: avoid;
              position: absolute;
              top: 1in;
              left: 0in;
              width: 3in;
              height: 5in;
            }
            .print-only-map img {
              width:auto;
              height:5in;
            }}`;
    document.head.appendChild(style);

    window.print();

    // cleanup/remove elements
    document.body.removeChild(printElement);
    document.head.removeChild(style);
    printMap.remove();
    document.body.removeChild(printContainer);
  }
}
