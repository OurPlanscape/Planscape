import { Component } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { AsyncPipe, NgIf } from '@angular/common';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { map, Observable, skip, switchMap, tap } from 'rxjs';
import {
  Metric,
  METRICS,
  SLOT_COLORS,
  YEAR_INTERVAL_PROPERTY,
} from '../metrics';
import { filter } from 'rxjs/operators';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { TreatmentTypeIconComponent } from '@styleguide';
import { MatTableModule } from '@angular/material/table';
import { NonForestedDataComponent } from '../non-forested-data/non-forested-data.component';
import { standIsForested } from '../stands';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MetricSelectorComponent } from '../metric-selector/metric-selector.component';
import { getBasicChartOptions } from '../chart-helper';

@UntilDestroy()
@Component({
  selector: 'app-stand-data-chart',
  standalone: true,
  imports: [
    NgChartsModule,
    NgIf,
    AsyncPipe,
    TreatmentTypeIconComponent,
    MatTableModule,
    NonForestedDataComponent,
    MatProgressSpinnerModule,
    MetricSelectorComponent,
  ],
  templateUrl: './stand-data-chart.component.html',
  styleUrl: './stand-data-chart.component.scss',
})
export class StandDataChartComponent {
  activeStand$ = this.directImpactsStateService.activeStand$;
  activeMetric$ = this.directImpactsStateService.activeMetric$;

  activeStandIsForested$ = this.activeStand$.pipe(
    map((d) => standIsForested(d))
  );

  chartTitle(s: MapGeoJSONFeature) {
    if (!s.properties['project_area_name'] || !s.properties['id']) {
      return '';
    }
    return `${s.properties['project_area_name']}, Stand ${s.properties['id']}`;
  }

  activeStandValues$: Observable<number[]> =
    this.directImpactsStateService.activeStand$.pipe(
      filter((s): s is MapGeoJSONFeature => s !== null),
      map((a) => {
        return Object.values(YEAR_INTERVAL_PROPERTY).map(
          (property) => a.properties[property] * 100
        );
      })
    );

  barChartData$ = this.activeStandValues$.pipe(
    map((data) => {
      this.updateYAxisRange(data); // Updating the range dinamically
      return {
        labels: [0, 5, 10, 15, 20],
        datasets: [
          {
            data: data,
            barThickness: 30,
          },
        ],
      } as ChartConfiguration<'bar'>['data'];
    })
  );

  loading = false;

  metrics: Metric[] = METRICS;
  baseOptions = getBasicChartOptions();

  constructor(private directImpactsStateService: DirectImpactsStateService) {
    // this puts a loader when we change the metric
    // and removes it once we get a new value from standsTxSourceLoaded$
    this.directImpactsStateService.activeMetric$
      .pipe(
        tap(() => (this.loading = true)),
        switchMap((s) =>
          this.directImpactsStateService.standsTxSourceLoaded$.pipe(skip(1))
        ),
        untilDestroyed(this)
      )
      .subscribe(() => (this.loading = false));
  }

  metricChanged(metric: Metric) {
    this.directImpactsStateService.setActiveMetric(metric);
  }

  private readonly staticBarChartOptions: ChartConfiguration<'bar'>['options'] =
    {
      ...this.baseOptions,
      animation: false,
    };

  barChartOptions$: Observable<ChartConfiguration<'bar'>['options']> =
    this.directImpactsStateService.activeMetric$.pipe(
      map((activeMetric) => {
        const color = SLOT_COLORS['blue'];
        const options = {
          backgroundColor: color,
          borderColor: color,
          elements: {
            bar: {
              hoverBackgroundColor: color,
            },
          },
        };
        return {
          ...options,
          ...this.staticBarChartOptions,
        };
      })
    );

  private updateYAxisRange(data: number[]) {
    const maxValue = Math.max(...data.map(Math.abs));
    const minValue = Math.min(...data.map(Math.abs));
    const roundedMax = Math.ceil(maxValue / 50) * 50;
    const roundedMin = Math.floor(minValue / 50) * 50;
    (this.staticBarChartOptions as any).scales!.y!.min = roundedMax;
    (this.staticBarChartOptions as any).scales!.y!.max = roundedMin;
  }
}
