import { Component, Input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
} from 'rxjs';
import {
  ImpactsMetricSlot,
  Metric,
  SLOT_COLORS,
  SLOT_PALETTES,
} from '../metrics';
import { TreatmentsService } from '@services/treatments.service';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TreatmentsState } from '../treatments.state';
import deepEqual from 'fast-deep-equal';
import { TreatmentPlan } from '@types';
import { getBasicChartOptions, updateYAxisRange } from '../chart-helper';

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
  imports: [CommonModule, NgChartsModule],
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

  baseOptions = getBasicChartOptions();

  emptyData = false;

  readonly staticBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    ...this.baseOptions,
    animation: false,
    scales: {
      ...this.baseOptions?.scales,
      x: {
        ...this.baseOptions?.scales?.['x'],
        title: {
          ...this.baseOptions?.scales?.['x']?.['title'],
          ...{
            padding: {
              ...{ top: -20 },
            },
          },
        },
      },
    },
  };

  chartConfiguration(
    data: Record<ImpactsMetricSlot, ChangeOverTimeChartItem[]>
  ) {
    if (!data || this.emptyData) {
      return undefined;
    }
    const allValues = Object.values(data).flatMap((entries) =>
      entries.map((entry) => entry.avg_value)
    );
    updateYAxisRange(allValues, this.staticBarChartOptions);
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

  isDataEmpty(givenData: any[]): boolean {
    return givenData.every((e) => !e.value);
  }

  barChartData$ = combineLatest([
    this.treatmentsState.treatmentPlan$.pipe(
      filter((plan): plan is TreatmentPlan => !!plan)
    ),
    this.directImpactsStateService.reportMetrics$?.pipe(
      distinctUntilChanged((prev, curr) => deepEqual(prev, curr))
    ),
    this.directImpactsStateService.selectedProjectArea$,
    this.directImpactsStateService.filteredTreatmentTypes$,
  ]).pipe(
    switchMap(([plan, metrics, area, txTypes]) => {
      const metricsArray = Object.values(metrics).map((m) => m.id);
      let selectedArea = null;
      if (area !== 'All') {
        selectedArea = area.project_area_id;
      }
      this.emptyData = false;

      return this.treatmentsService
        .getTreatmentImpactCharts(plan.id, metricsArray, selectedArea, txTypes)
        .pipe(
          map((responseData) => ({ response: responseData, metrics: metrics }))
        ); // we need the metrics for reviewing calculation, so passing it along here
    }),
    map((responseData) => {
      const resultData = responseData.response as ImpactsResultData[];
      this.emptyData = this.isDataEmpty(resultData);
      return this.chartConfiguration(
        this.convertImpactResultToChartData(resultData, responseData.metrics)
      );
    })
  );
}
