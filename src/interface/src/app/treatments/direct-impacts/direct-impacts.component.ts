import { Component, Injector, OnDestroy, OnInit } from '@angular/core';
import {
  AsyncPipe,
  DatePipe,
  JsonPipe,
  NgClass,
  NgIf,
  NgStyle,
} from '@angular/common';
import { SharedModule } from '@shared';

import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, switchMap } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { getMergedRouteData } from '../treatments-routing-data';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { DirectImpactsSyncedMapsComponent } from '../direct-impacts-synced-maps/direct-impacts-synced-maps.component';
import {
  ButtonComponent,
  ModalComponent,
  PanelComponent,
  TreatmentTypeIconComponent,
} from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSlideToggleChange,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { MetricFiltersComponent } from '../metric-filters/metric-filters.component';
import { ImpactsMetric } from '../metrics';
import { DirectImpactsMapLegendComponent } from '../direct-impacts-map-legend/direct-impacts-map-legend.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ExpandedStandDataChartComponent } from '../expanded-stand-data-chart/expanded-stand-data-chart.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ExpandedDirectImpactMapComponent } from '../expanded-direct-impact-map/expanded-direct-impact-map.component';

@Component({
  selector: 'app-direct-impacts',
  standalone: true,
  imports: [
    AsyncPipe,
    SharedModule,
    DirectImpactsMapComponent,
    DirectImpactsSyncedMapsComponent,
    PanelComponent,
    MatIconModule,
    NgIf,
    MatSlideToggleModule,
    ButtonComponent,
    DatePipe,
    NgClass,
    FormsModule,
    TreatmentMapComponent,
    TreatmentLegendComponent,
    MetricFiltersComponent,
    MetricFiltersComponent,
    NgStyle,
    DirectImpactsMapLegendComponent,
    JsonPipe,
    StandDataChartComponent,
    TreatmentTypeIconComponent,
    ExpandedStandDataChartComponent,
    ModalComponent,
    MatDialogModule,
  ],
  providers: [
    DirectImpactsStateService,
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
  ],
  templateUrl: './direct-impacts.component.html',
  styleUrl: './direct-impacts.component.scss',
})
export class DirectImpactsComponent implements OnInit, OnDestroy {
  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfigState: MapConfigState,
    private route: ActivatedRoute,
    private router: Router,
    private directImpactsStateService: DirectImpactsStateService,
    private dialog: MatDialog,
    private injector: Injector // Angular's injector for passing shared services
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
          this.mapConfigState.setShowFillProjectAreas(false);
          this.mapConfigState.updateShowTreatmentStands(true);
          this.mapConfigState.updateShowProjectAreas(true);
        }),
        catchError((error) => {
          this.router.navigate(['/']);
          throw error;
        })
      )
      .subscribe();
  }

  breadcrumbs$ = this.treatmentsState.breadcrumbs$;
  treatmentPlan$ = this.treatmentsState.treatmentPlan$;

  showTreatmentPrescription$ =
    this.directImpactsStateService.showTreatmentPrescription$;

  standChartPanelTitle$ = this.directImpactsStateService.activeStand$.pipe(
    map((activeStand) => {
      if (!activeStand) {
        return 'Stand Level Data Unavailable';
      }
      return `${activeStand.properties['project_area_name']}, Stand ${activeStand.properties['id']}`;
    })
  );

  activeMetric$ = this.directImpactsStateService.activeMetric$.pipe(
    map((m) => m.metric)
  );

  filterOptions$ = this.directImpactsStateService.reportMetrics$.pipe(
    map((metrics) => Object.values(metrics).map((metric) => metric.id))
  );

  mapPanelTitle$ = this.directImpactsStateService.mapPanelTitle$;

  activateMetric(data: ImpactsMetric) {
    this.directImpactsStateService.setActiveMetric(data);
  }

  updateReportMetric(data: ImpactsMetric) {
    this.directImpactsStateService.updateReportMetric(data);
  }

  ngOnInit(): void {
    // Register the plugin only when this component is initialized
    Chart.register(ChartDataLabels);
  }

  ngOnDestroy(): void {
    // Unregister the plugin when the component is destroyed
    Chart.unregister(ChartDataLabels);
  }

  expandStandChart() {
    this.dialog.open(ExpandedStandDataChartComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }

  expandMaps() {
    this.dialog.open(ExpandedDirectImpactMapComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }

  saveShowTreatmentPrescription(value: MatSlideToggleChange) {
    this.directImpactsStateService.setShowTreatmentPrescription(value.checked);
  }
}
