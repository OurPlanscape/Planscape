import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { catchError, map, switchMap } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { getMergedRouteData } from '../treatments-routing-data';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { DirectImpactsSyncedMapsComponent } from '../direct-impacts-synced-maps/direct-impacts-synced-maps.component';
import { ButtonComponent, PanelComponent, PanelIconButton } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { MetricFiltersComponent } from './metric-filters/metric-filters.component';
import { MapMetric } from '../metrics';
import { DirectImpactsMapLegendComponent } from '../direct-impacts-map-legend/direct-impacts-map-legend.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { TreatmentTypeIconComponent } from '../../../styleguide/treatment-type-icon/treatment-type-icon.component';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { TreatmentProjectArea, Extent } from '@types';
import { MatSelectModule } from '@angular/material/select';
import { Point } from 'geojson';

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
  ],
  providers: [
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
    private directImpactsStateService: DirectImpactsStateService
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
  showTreatmentPrescription = false;
  changeChartButtons: PanelIconButton[] = [
    { icon: 'open_in_full', actionName: 'expand' },
  ];
  //TODO: can we move these to state service?
  // REMOVE:
  sampleExtent: Extent = [1, 2, 3, 4];
  samplePoint: Point = { type: 'Point', coordinates: [] };
  availableProjectAreas: TreatmentProjectArea[] = [
    {
      project_area_id: 20,
      project_area_name: 'Project Area 1',
      total_stand_count: 1,
      prescriptions: [],
      extent: this.sampleExtent,
      centroid: this.samplePoint,
    },
    {
      project_area_id: 20,
      project_area_name: 'Project Area 2',
      total_stand_count: 1,
      prescriptions: [],
      extent: this.sampleExtent,
      centroid: this.samplePoint,
    },
    {
      project_area_id: 20,
      project_area_name: 'Project Area 3',
      total_stand_count: 1,
      prescriptions: [],
      extent: this.sampleExtent,
      centroid: this.samplePoint,
    },
    {
      project_area_id: 20,
      project_area_name: 'Project Area 4',
      total_stand_count: 1,
      prescriptions: [],
      extent: this.sampleExtent,
      centroid: this.samplePoint,
    },
  ];
  selectedChartProjectArea = { name: 1, value: 'ok' };

  activateMetric(data: MapMetric) {
    this.directImpactsStateService.activeMetric$.next(data);
    this.directImpactsStateService.getChangesOverTimeData();
  }

  getValues(activeStand: MapGeoJSONFeature) {}

  ngOnInit(): void {
    // Register the plugin only when this component is initialized
    Chart.register(ChartDataLabels);
  }

  ngOnDestroy(): void {
    // Unregister the plugin when the component is destroyed
    Chart.unregister(ChartDataLabels);
  }

  setChartProjectArea(e: Event) {
    this.directImpactsStateService.setProjectAreaForChanges(
      this.selectedChartProjectArea.value
    );
  }
}
