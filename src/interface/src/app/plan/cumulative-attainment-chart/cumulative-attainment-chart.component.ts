import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ScenarioResult } from '@types';
import { processCumulativeAttainment } from '../plan-helpers';
import { ChartOptions, InteractionMode, TooltipItem } from 'chart.js';
import {
  getChartBorderDash,
  getChartFontConfig,
  getDarkGridConfig,
  whiteTooltipBaseConfig,
} from '../../chart-helper';
import { CHART_COLORS } from '@shared';
import { ChartComponent } from '@styleguide';
import { ScenarioMetricsLegendComponent } from '../scenario-results/scenario-metrics-legend/scenario-metrics-legend.component';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-cumulative-attainment-chart',
  standalone: true,
  imports: [AsyncPipe, NgChartsModule, ChartComponent, ScenarioMetricsLegendComponent],
  templateUrl: './cumulative-attainment-chart.component.html',
  styleUrl: './cumulative-attainment-chart.component.scss',
})
export class CumulativeAttainmentChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;

  selectedMetrics: Set<string> = new Set<string>();

  options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 5,
          maxRotation: 0,
          minRotation: 0,
          callback: function (value) {
            return Number(value).toLocaleString('en-US');
          },
        },
        grid: {
          color: '#FFFFFFFF',
          tickColor: 'black',
          borderColor: 'black',
        },
      },
      y: {
        beginAtZero: true,
        min: -10,
        title: {
          display: false,
        },
        grid: {
          borderDash: getChartBorderDash(),
          ...getDarkGridConfig(),
        },
        ticks: {
          maxTicksLimit: 5,
          callback: (value) => {
            return value === -10 ? '' : value;
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as InteractionMode,
      intersect: false,
    },
    plugins: {
      tooltip: {
        ...whiteTooltipBaseConfig(),
        callbacks: {
          title: () => '',
          label: (context: TooltipItem<'line'>) => context.dataset.label ?? '',
        },
      },
      datalabels: {
        font: {
          ...getChartFontConfig(),
          size: 10,
        },
      },
      legend: {
        display: false,
      },
    },
  };

  allData: any = {};

  selectedData$: BehaviorSubject<any> = new BehaviorSubject({});

  ngOnInit(): void {
    const d = processCumulativeAttainment(this.scenarioResult.result.features);
    this.allData.labels = d.area.map((data) => Math.round(data));
    this.allData.datasets = d.datasets.map((data, index) => {
      return {
        ...data,
        ...this.colorForLabel(data.label),
        pointRadius: 0, // Hides the circles
      };
    });
    // todo: add dataset type
    this.allData.datasets.forEach((dataset: any) =>
      this.selectedMetrics.add(dataset.label)
    );
    this.selectedData$.next(structuredClone(this.allData));
  }

  onMetricChange(event: MatCheckboxChange) {
    if (event.checked) {
      this.selectedMetrics.add(event.source.value);
    } else {
      this.selectedMetrics.delete(event.source.value);
    }
    const selectedData = {
      ...this.allData,
      datasets: this.allData.datasets.filter((d:any) => this.selectedMetrics.has(d.label))
    }
    this.selectedData$.next(selectedData);
  }

  colorForLabel(label: string) {
    return {
      backgroundColor: CHART_COLORS[label],
      borderColor: CHART_COLORS[label],
      pointBackgroundColor: CHART_COLORS[label],
      pointBorderColor: CHART_COLORS[label],
    };
  }
}
