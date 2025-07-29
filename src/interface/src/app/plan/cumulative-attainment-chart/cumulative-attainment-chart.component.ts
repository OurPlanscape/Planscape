import { Component, Input, OnInit } from '@angular/core';
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
import { ChartColors } from '@shared';
import { ChartComponent } from '../../../styleguide/chart/chart.component';

@Component({
  selector: 'app-cumulative-attainment-chart',
  standalone: true,
  imports: [NgChartsModule, ChartComponent],
  templateUrl: './cumulative-attainment-chart.component.html',
  styleUrl: './cumulative-attainment-chart.component.scss',
})
export class CumulativeAttainmentChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;

  options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 5,
        },
        grid: {
          color: '#FFFFFFFF',
          tickColor: 'black',
          borderColor: 'black',
        },
      },
      y: {
        title: {
          display: false,
        },
        grid: {
          borderDash: getChartBorderDash(),
          ...getDarkGridConfig(),
        },
        ticks: {
          maxTicksLimit: 4,
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

  data: any = {};

  ngOnInit(): void {
    const d = processCumulativeAttainment(this.scenarioResult.result.features);
    this.data.labels = d.area.map((data) => Math.round(data));
    this.data.datasets = d.datasets.map((data, index) => {
      return {
        ...data,
        ...this.colorForLabel(data.label),
        pointRadius: 0, // Hides the circles
      };
    });
  }

  colorForLabel(label: string) {
    return {
      backgroundColor: ChartColors[label],
      borderColor: ChartColors[label],
      pointBackgroundColor: ChartColors[label],
      pointBorderColor: ChartColors[label],
    };
  }
}
