import { Component } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { map, Observable } from 'rxjs';
import { SLOT_COLORS } from '../metrics';

@Component({
  selector: 'app-stand-data-chart',
  standalone: true,
  imports: [NgChartsModule, NgIf, AsyncPipe, JsonPipe],
  templateUrl: './stand-data-chart.component.html',
  styleUrl: './stand-data-chart.component.scss',
})
export class StandDataChartComponent {
  constructor(private directImpactsStateService: DirectImpactsStateService) {}

  activeStandValues$: Observable<number[]> =
    this.directImpactsStateService.activeStand$.pipe(
      map((a) => {
        return [
          a.properties['delta_0'] * 100,
          a.properties['delta_5'] * 100,
          a.properties['delta_10'] * 100,
          a.properties['delta_15'] * 100,
          a.properties['delta_20'] * 100,
        ];
      })
    );

  barChartData$ = this.activeStandValues$.pipe(
    map((data) => {
      return {
        labels: [0, 5, 10, 15, 20],
        datasets: [
          {
            data: data,
            barThickness: 20,
          },
        ],
      } as ChartConfiguration<'bar'>['data'];
    })
  );

  private readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      y: {
        min: -100,
        max: 100,
        ticks: {
          padding: 20,
          stepSize: 50,
        },
        title: {
          display: false,
        },
        grid: {
          drawBorder: false, // Remove the border line along the y-axis
          lineWidth: 1, // Set line width for dotted lines
          color: 'rgba(0, 0, 0, 0.2)', // Dotted line color
          borderDash: [4, 4], // Define the dash pattern (4px dash, 4px gap)
        },
      },
      x: {
        grid: {
          display: false, // Remove grid lines along the x-axis
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
        },
        title: {
          display: true,
          text: 'Time Steps (Years)',
          align: 'start',
          padding: { top: 20 },
        },
      },
    },
  };

  barChartOptions$: Observable<ChartConfiguration<'bar'>['options']> =
    this.directImpactsStateService.activeMetric$.pipe(
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
          ...this.barChartOptions,
        };
      })
    );
}
