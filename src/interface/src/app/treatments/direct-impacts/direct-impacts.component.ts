import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { ButtonComponent, PanelComponent } from '@styleguide';
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

  activateMetric(data: MapMetric) {
    this.directImpactsStateService.activeMetric$.next(data);
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
}
