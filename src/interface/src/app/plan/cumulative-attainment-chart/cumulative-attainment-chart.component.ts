import { Component, Input, OnInit } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ScenarioResult } from '@types';
import { processCumulativeAttainment } from '../plan-helpers';
import { ChartOptions, InteractionMode, TooltipItem } from 'chart.js';

@Component({
  selector: 'app-cumulative-attainment-chart',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './cumulative-attainment-chart.component.html',
  styleUrl: './cumulative-attainment-chart.component.scss',
})
export class CumulativeAttainmentChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;

  options: ChartOptions<'line'> = {
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Cumulative Area treated (Acres)',
        },
        ticks: {
          maxTicksLimit: 5,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Cumulative Attainment (%)',
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
        enabled: true,
        displayColors: false, // ⛔ remove color box
        callbacks: {
          title: () => '', // ⛔ remove title
          label: (context: TooltipItem<'line'>) => context.dataset.label ?? '',
        },
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
        ...this.colorForIndex(index),
        pointRadius: 0, // Hides the circles
      };
    });
  }

  colorForIndex(i: number) {
    const CHART_COLORS = [
      '#483D78',
      '#A59CCD',
      '#BBE3B6',
      '#85B167',
      '#FFDB69',
      '#F18226',
      '#483D78',
      '#483D78',
      '#CC4678',
    ];

    return {
      backgroundColor: CHART_COLORS[i - 1],
      borderColor: CHART_COLORS[i - 1],
      pointBackgroundColor: CHART_COLORS[i - 1],
      pointBorderColor: CHART_COLORS[i - 1],
    };
  }
}
