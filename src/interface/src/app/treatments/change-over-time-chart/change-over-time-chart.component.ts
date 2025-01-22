import { Component, Input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { AsyncPipe, NgIf } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import {
  map,
  combineLatest,
  distinctUntilChanged,
  switchMap,
  filter,
} from 'rxjs';
import {
  SLOT_COLORS,
  ImpactsMetricSlot,
  Metric,
  SLOT_PALETTES,
} from '../metrics';
import { TreatmentsService } from '@services/treatments.service';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TreatmentsState } from '../treatments.state';
import deepEqual from 'fast-deep-equal';
import { TreatmentPlan } from '@types';

const baseFont = {
  family: 'Public Sans',
  size: 14,
  style: 'normal',
  weight: '600',
};

export interface ImpactsResultData {
  year: number;
  variable: string;
  dividend: number;
  divisor: number;
  value: number;
  delta: number;
  relative_year: number;
}

export interface ChangeOverTimeChartItem {
  variable: string;
  year: number;
  avg_value: number;
}

@UntilDestroy()
@Component({
  selector: 'app-change-over-time-chart',
  standalone: true,
  imports: [NgChartsModule, AsyncPipe, NgIf],
  templateUrl: './change-over-time-chart.component.html',
  styleUrl: './change-over-time-chart.component.scss',
})
export class ChangeOverTimeChartComponent {
  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService
  ) {}

  @Input() metrics!: Record<ImpactsMetricSlot, Metric> | null;

  readonly staticBarChartOptions: ChartConfiguration<'bar'>['options'] =
    {
      responsive: true,
      maintainAspectRatio: false,
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
          color: '#000', // Label color (inside bar)
          anchor: 'end', // Position the label
          align: (context) => {
            const value = context.dataset.data[context.dataIndex] as number;
            return value < 0 ? 'start' : 'end';
          },
          offset: (context) => {
            const value = context.dataset.data[context.dataIndex] as number;
            return value < 0 ? 12 : 0;
          },
          padding: 5,
          font: {
            ...(baseFont as any),
            size: 10, // Font size
          },
          formatter: (value: number) => {
            // Check if the value has a decimal part
            return value % 1 === 0 ? value.toString() : value.toFixed(0);
          },
        },
      },
      scales: {
        y: {
          min: -100,
          max: 100,
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

  chartConfiguration(data: Record<any, any>) {
    if (!data) {
      return undefined;
    }
    return {
      labels: [0, 5, 10, 15, 20],
      datasets: [
        {
          data: data['blue'].map((d: ChangeOverTimeChartItem) => d.avg_value),
          backgroundColor: SLOT_COLORS['blue'],
          hoverBackgroundColor: SLOT_PALETTES['blue'][0],
        },
        {
          data: data['purple'].map((d: ChangeOverTimeChartItem) => d.avg_value),
          backgroundColor: SLOT_COLORS['purple'],
          hoverBackgroundColor: SLOT_PALETTES['purple'][0],
        },
        {
          data: data['orange'].map((d: ChangeOverTimeChartItem) => d.avg_value),
          backgroundColor: SLOT_COLORS['orange'],
          hoverBackgroundColor: SLOT_PALETTES['orange'][0],
        },
        {
          data: data['green'].map((d: ChangeOverTimeChartItem) => d.avg_value),
          backgroundColor: SLOT_COLORS['green'],
          hoverBackgroundColor: SLOT_PALETTES['green'][0],
        },
      ],
    } as ChartConfiguration<'bar'>['data'];
  }


  convertImpactResultToChartData(
    resultData: ImpactsResultData[],
    metrics: Record<ImpactsMetricSlot, Metric>
  ): Record<ImpactsMetricSlot, ChangeOverTimeChartItem[]> {
    const chartData = resultData.map((d) => {
      return {
        // map the returned data to data attributes for the map
        year: d.relative_year,
        avg_value: d.delta * 100,
        variable: d.variable,
      };
    });
    const dataBySlot = {
      blue: chartData
        .filter((item) => item.variable === metrics.blue.id)
        .sort((a, b) => a.year - b.year),
      green: chartData
        .filter((item) => item.variable === metrics.green.id)
        .sort((a, b) => a.year - b.year),
      purple: chartData
        .filter((item) => item.variable === metrics.purple.id)
        .sort((a, b) => a.year - b.year),
      orange: chartData
        .filter((item) => item.variable === metrics.orange.id)
        .sort((a, b) => a.year - b.year),
    };
    return dataBySlot;
  }

  barChartData$ = combineLatest([
    this.treatmentsState.treatmentPlan$.pipe(
      filter((plan): plan is TreatmentPlan => !!plan)
    ),
    this.directImpactsStateService.reportMetrics$?.pipe(
      distinctUntilChanged((prev, curr) => deepEqual(prev, curr))
    ),
    this.directImpactsStateService.selectedProjectArea$,
  ]).pipe(
    switchMap(([plan, metrics, area]) => {
      const metricsArray = Object.values(metrics).map((m) => m.id);
      let selectedArea = null;
      if (area !== 'All') {
        selectedArea = area.project_area_id;
      }
      return this.treatmentsService
        .getTreatmentImpactCharts(plan.id, metricsArray, selectedArea)
        .pipe(
          map((responseData) => ({ response: responseData, metrics: metrics }))
        ); // we need the metrics for reviewing calculation, so passing it along here
    }),
    map((responseData) => {
      const resultData = responseData.response as ImpactsResultData[];
      return this.chartConfiguration(
        this.convertImpactResultToChartData(resultData, responseData.metrics)
      );
    })
  );
}
