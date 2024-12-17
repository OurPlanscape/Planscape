import { Component, Injector, OnDestroy, OnInit } from '@angular/core';
import {
  AsyncPipe,
  DatePipe,
  JsonPipe,
  NgClass,
  NgIf,
  NgFor,
  NgStyle,
} from '@angular/common';
import { SharedModule } from '@shared';
import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { getMergedRouteData } from '../treatments-routing-data';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { DirectImpactsSyncedMapsComponent } from '../direct-impacts-synced-maps/direct-impacts-synced-maps.component';
import {
  ButtonComponent,
  PanelComponent,
  PanelIconButton,
  ModalComponent,
} from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { MetricFiltersComponent } from '../metric-filters/metric-filters.component';
import { ImpactsMetric } from '../metrics';
import { DirectImpactsMapLegendComponent } from '../direct-impacts-map-legend/direct-impacts-map-legend.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { TreatmentTypeIconComponent } from '../../../styleguide/treatment-type-icon/treatment-type-icon.component';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { MatSelectModule } from '@angular/material/select';
import { ExpandedStandDataChartComponent } from '../expanded-stand-data-chart/expanded-stand-data-chart.component';
import { ExpandedChangeOverTimeChartComponent } from '../expanded-change-over-time-chart/expanded-change-over-time-chart.component';
import { MatDialog } from '@angular/material/dialog';

export interface ImpactsProjectArea {
  project_area_id: number;
  project_area_name: string;
}

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
    MatSelectModule,
    NgIf,
    NgFor,
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
    ChangeOverTimeChartComponent,
    ExpandedStandDataChartComponent,
    ExpandedChangeOverTimeChartComponent,
    ModalComponent,
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
  activeStand$ = this.directImpactsStateService.activeStand$;
  selectedChartProjectArea: ImpactsProjectArea = {
    project_area_id: 1,
    project_area_name: 'ok',
  };

  showTreatmentPrescription = false;
  changeChartButtons: PanelIconButton[] = [
    { icon: 'open_in_full', actionName: 'expand' },
  ];
  availableProjectAreas$ =
    this.directImpactsStateService.availableProjectAreas$;

  standChartPanelTitle$ = this.directImpactsStateService.activeStand$.pipe(
    map((activeStand) => {
      if (!activeStand) {
        return 'Stand Level Data Unavailable';
      }
      return `${activeStand.properties['project_area_name']}, Stand ${activeStand.properties['id']}`;
    })
  );

  activateMetric(data: ImpactsMetric) {
    this.directImpactsStateService.setActiveMetric(data);
    this.directImpactsStateService.getChangesOverTimeData();
  }

  activeMetric$ = this.directImpactsStateService.activeMetric$.pipe(
    map((m) => m.metric)
  );

  // todo: placeholder to fill once we have project area filter
  projectArea$ = of('All Project Areas');

  mapPanelTitle$ = combineLatest([
    this.directImpactsStateService.activeMetric$,
    this.projectArea$,
  ]).pipe(
    map(([activeMetric, pa]) => `${activeMetric.metric.label} for ${pa}`)
  );

  getValues(activeStand: MapGeoJSONFeature) {}

  ngOnInit(): void {
    // Register the plugin only when this component is initialized
    Chart.register(ChartDataLabels);
  }

  ngOnDestroy(): void {
    // Unregister the plugin when the component is destroyed
    Chart.unregister(ChartDataLabels);
  }

  setChartProjectArea() {
    this.directImpactsStateService.setProjectAreaForChanges(
      this.selectedChartProjectArea
    );
  }

  expandChangeChart() {
    this.dialog.open(ExpandedChangeOverTimeChartComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }

  expandStandChart() {
    this.dialog.open(ExpandedStandDataChartComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }
}
