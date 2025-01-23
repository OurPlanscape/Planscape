import { Component } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
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

const baseFont = {
  family: 'Public Sans',
  size: 14,
  style: 'normal',
  weight: '600',
};

@UntilDestroy()
@Component({
  selector: 'app-stand-data-chart',
  standalone: true,
  imports: [
    NgChartsModule,
    NgIf,
    AsyncPipe,
    JsonPipe,
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
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: {
          left: 0, // Add 20px padding between the tick labels and the chart content
          right: 24,
          top: 0,
          bottom: 0,
        },
      },
      plugins: {
        tooltip: {
          enabled: false,
        },
        datalabels: {
          color: '#000', // Label color (outside the bar)
          backgroundColor: '#fff',
          anchor: (context) => {
            const value = context.dataset.data[context.dataIndex] as number;
            return value < 0 ? 'start' : 'end';
          }, // Position the label
          align: (context) => {
            const value = context.dataset.data[context.dataIndex] as number;
            return value < 0 ? 'bottom' : 'top';
          },
          font: {
            ...(baseFont as any),
            size: 10, // Font size
          },
          formatter: (value: number) => {
            // Check if the value has a decimal part
            return value % 1 === 0 ? value.toString() : value.toFixed(1);
          },
          clamp: true,
        },
      },
      scales: {
        y: {
          ticks: {
            color: '#4A4A4A', // Text color
            font: baseFont as any,
            padding: 24,
            stepSize: 50,
            callback: (value) => `${value}%`,
          },
          title: {
            display: false,
          },
          grid: {
            drawBorder: false, // Remove the border along the y-axis
            drawTicks: false,
            lineWidth: 1, // Set line width for dotted lines
            color: '#979797', // Dotted line color
            borderDash: [5, 5], // Define the dash pattern (4px dash, 4px gap)
          },
        },
        x: {
          grid: {
            display: false, // Disable grid lines for the x-axis
            drawBorder: false, // Remove the bottom border (x-axis line)
            drawTicks: false, // Remove the tick marks on the x-axis
          },
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            font: baseFont as any,
            padding: 24,
          },
          title: {
            display: true,
            text: 'Time Steps (Years)',
            align: 'start',
            color: '#898989', // Text color
            font: baseFont as any,
          },
        },
      },
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
    let roundedMax = Math.ceil(maxValue / 50) * 50;
    if (roundedMax < 100) {
      roundedMax = 100;
    }
    (this.staticBarChartOptions as any).scales!.y!.min = -roundedMax;
    (this.staticBarChartOptions as any).scales!.y!.max = roundedMax;
  }
}
