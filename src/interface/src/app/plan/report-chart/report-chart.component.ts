import { Component, Input, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { PROJECT_AREA_COLORS } from '@shared';

@Component({
  selector: 'app-report-chart',
  templateUrl: './report-chart.component.html',
  styleUrls: ['./report-chart.component.scss'],
})
export class ReportChartComponent implements OnInit {
  @Input() measurement = '';
  @Input() values: number[] = [];

  public barChartData: ChartConfiguration<'bar'>['data'] | null = null;

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    backgroundColor: '#4965c7',
    borderColor: '#4965c7',
    elements: {
      bar: {
        hoverBackgroundColor: '#577bf9',
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        enabled: false,
      },
    },
  };

  ngOnInit() {
    this.barChartData = {
      labels: this.values.map((v, i) => i + 1),
      datasets: [
        {
          data: this.values,
          backgroundColor: PROJECT_AREA_COLORS,
        },
      ],
    };

    this.barChartOptions = {
      ...this.barChartOptions,
      ...{
        scales: {
          y: {
            title: {
              display: true,
              text: this.measurement,
            },
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
            },
            title: {
              display: true,
              text: 'Project Area',
            },
          },
        },
      },
    };
  }
}
