import { Component, Input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { AsyncPipe, NgIf } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { map, Observable } from 'rxjs';
import { SLOT_COLORS, ImpactsMetricSlot, Metric } from '../metrics';
import { ChartData } from '../../../app/plan/project-areas-metrics/chart-data';
import { TreatmentPlan, TreatmentProjectArea } from '@types';
import { TreatmentsService } from '@services/treatments.service';
import { UntilDestroy } from '@ngneat/until-destroy';

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
    private treatmentsService: TreatmentsService
  ) {}

  @Input() treatmentPlan!: TreatmentPlan | null;
  @Input() metrics!: Record<ImpactsMetricSlot, Metric> | null;
  @Input() projectArea!: TreatmentProjectArea | string | null;

  private readonly staticBarChartOptions: ChartConfiguration<'bar'>['options'] =
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
          color: '#fff', // Label color (inside bar)
          anchor: 'center', // Position the label at the center
          align: 'center', // Align the label horizontally
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
        },
        {
          data: data['purple'].map((d: ChangeOverTimeChartItem) => d.avg_value),
          backgroundColor: SLOT_COLORS['purple'],
        },
        {
          data: data['orange'].map((d: ChangeOverTimeChartItem) => d.avg_value),
          backgroundColor: SLOT_COLORS['orange'],
        },
        {
          data: data['green'].map((d: ChangeOverTimeChartItem) => d.avg_value),
          backgroundColor: SLOT_COLORS['green'],
        },
      ],
    } as ChartConfiguration<'bar'>['data'];
  }

  barChartOptions$: Observable<ChartConfiguration<'bar'>['options']> =
    this.directImpactsStateService.activeMetric$?.pipe(
      map((activeMetric) => {
        const slot = activeMetric.slot;
        const color = SLOT_COLORS[slot];
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

  get barChartData$(): Observable<ChartData<'bar', number[], unknown>> | null {
    if (!this.treatmentPlan || !this.metrics) {
      return null;
    }
    const metricsArray = Object.values(this.metrics).map((m) => m.id);
    const metrics = this.metrics;
    let selectedArea = null;
    if (this.projectArea !== 'All') {
      const pa = this.projectArea as TreatmentProjectArea;
      selectedArea = pa.project_area_id;
    }
    this.treatmentsService
      .getTreatmentImpactCharts(
        this.treatmentPlan?.id,
        metricsArray,
        selectedArea
      )
      .subscribe({
        next: (response: any) => {
          return this.chartConfiguration(
            this.convertImpactResultToChartData(
              response as ImpactsResultData[],
              metrics
            )
          );
        },
      });
    return null;
  }
}
