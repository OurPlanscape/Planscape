import { Component } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { AsyncPipe, NgIf } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { map } from 'rxjs';
import { ImpactsMetricSlot, SLOT_COLORS, SLOT_PALETTES } from '../metrics';
import { UntilDestroy } from '@ngneat/until-destroy';
import { getBasicChartOptions, updateYAxisRange } from '@app/chart-helper';
import {
  ChangeOverTimeChartItem,
  ChangeOverTimeChartService,
} from './change-over-time-chart.service';

@UntilDestroy()
@Component({
  selector: 'app-change-over-time-chart',
  standalone: true,
  imports: [NgChartsModule, AsyncPipe, NgIf],
  templateUrl: './change-over-time-chart.component.html',
  styleUrl: './change-over-time-chart.component.scss',
})
export class ChangeOverTimeChartComponent {
  constructor(public chartService: ChangeOverTimeChartService) {}

  baseOptions = getBasicChartOptions();

  readonly staticBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    ...this.baseOptions,
    animation: false,
    scales: {
      ...this.baseOptions?.scales,
      x: {
        ...this.baseOptions?.scales?.['x'],
        title: {
          ...this.baseOptions?.scales?.['x']?.['title'],
          padding: { top: -20 },
        },
      },
    },
  };

  barChartData$ = this.chartService.barChartData$.pipe(
    map((data) => (data ? this.chartConfiguration(data) : undefined))
  );

  private chartConfiguration(
    data: Record<ImpactsMetricSlot, ChangeOverTimeChartItem[]>
  ): ChartConfiguration<'bar'>['data'] {
    const allValues = Object.values(data).flatMap((entries) =>
      entries.map((entry) => entry.avg_value)
    );
    updateYAxisRange(allValues, this.staticBarChartOptions);
    return {
      labels: [0, 5, 10, 15, 20],
      datasets: [
        {
          data: data['blue'].map((d) => d.avg_value),
          backgroundColor: SLOT_COLORS['blue'],
          hoverBackgroundColor: SLOT_PALETTES['blue'][0],
        },
        {
          data: data['purple'].map((d) => d.avg_value),
          backgroundColor: SLOT_COLORS['purple'],
          hoverBackgroundColor: SLOT_PALETTES['purple'][0],
        },
        {
          data: data['orange'].map((d) => d.avg_value),
          backgroundColor: SLOT_COLORS['orange'],
          hoverBackgroundColor: SLOT_PALETTES['orange'][0],
        },
        {
          data: data['green'].map((d) => d.avg_value),
          backgroundColor: SLOT_COLORS['green'],
          hoverBackgroundColor: SLOT_PALETTES['green'][0],
        },
      ],
    };
  }
}
