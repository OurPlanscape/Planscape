import { Component } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-cumulative-attainment-chart',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './cumulative-attainment-chart.component.html',
  styleUrl: './cumulative-attainment-chart.component.scss',
})
export class CumulativeAttainmentChartComponent {
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

  data = {
    labels: [1, 2, 3, 4, 5],
    datasets: [
      {
        label: 'Treatment 1',
        data: [1, 2, 3, 4, 5],
        backgroundColor: 'red',
        borderColor: 'red',
        pointBackgroundColor: 'red', // fill of the points
        pointBorderColor: 'red',
      },
      {
        label: 'Treatment 2',
        data: [8, 2, 5, 6, 1],
        backgroundColor: 'green',
        borderColor: 'green',
        pointBackgroundColor: 'green', // fill of the points
        pointBorderColor: 'green',
      },
      {
        label: 'Dataset 3',
        data: [7, 5, 6, 8, 3],
        backgroundColor: 'blue',
        borderColor: 'blue',
        pointBackgroundColor: 'blue', // fill of the points
        pointBorderColor: 'blue',
      },
      {
        label: 'Dataset 4',
        data: [1, 2, 2, 3, 5],
        backgroundColor: 'yellow',
        borderColor: 'yellow',
        pointBackgroundColor: 'yellow', // fill of the points
        pointBorderColor: 'yellow',
      },
    ],
  };
}
