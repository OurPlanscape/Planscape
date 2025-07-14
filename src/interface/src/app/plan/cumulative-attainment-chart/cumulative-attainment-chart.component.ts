import { Component, Input, OnInit } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ScenarioResult } from '@types';
import { processCumulativeAttainment } from '../plan-helpers';

@Component({
  selector: 'app-cumulative-attainment-chart',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './cumulative-attainment-chart.component.html',
  styleUrl: './cumulative-attainment-chart.component.scss',
})
export class CumulativeAttainmentChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;

  options = {
    responsive: true,
    scales: {
      y: {
        title: {
          display: true,
          text: 'Cumulative Attainment (%)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Cumulative Area treated (Acres)',
        },
      },
    },
  };

  data: any = {};

  ngOnInit(): void {
    const d = processCumulativeAttainment(this.scenarioResult.result.features);
    console.log(d);
    this.data.labels = d.area.map((data) => Math.round(data));
    this.data.datasets = d.datasets.map((data, index) => {
      return {
        ...data,
        ...this.colorForIndex(index),
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
