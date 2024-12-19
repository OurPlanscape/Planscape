import { Component, Input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { AsyncPipe } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { map, Observable } from 'rxjs';
import { SLOT_COLORS } from '../metrics';

const baseFont = {
  family: 'Public Sans',
  size: 14,
  style: 'normal',
  weight: '600',
};

@Component({
  selector: 'app-change-over-time-chart',
  standalone: true,
  imports: [NgChartsModule, AsyncPipe],
  templateUrl: './change-over-time-chart.component.html',
  styleUrl: './change-over-time-chart.component.scss',
})
export class ChangeOverTimeChartComponent {
  constructor(private directImpactsStateService: DirectImpactsStateService) {}

  @Input() projectAreaSelection = null;

  projectAreaChangeData$ = this.directImpactsStateService.changeOverTimeData$;

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

  barChartData$ = this.projectAreaChangeData$?.pipe(
    map((data) => {
      // if we don't have data here (eg., it hasn't loaded yet), it will be likely an empty array
      if (!data || data.length === 0) {
        return undefined;
      }

      return {
        labels: [0, 5, 10, 15, 20],
        datasets: [
          {
            label: data[0][0].variable,
            data: data[0].map((d) => d.avg_value),
            backgroundColor: SLOT_COLORS['blue'],
          },
          {
            label: data[0][1].variable,
            data: data[1].map((d) => d.avg_value),
            backgroundColor: SLOT_COLORS['purple'],
          },
          {
            label: data[0][2].variable,
            data: data[2].map((d) => d.avg_value),
            backgroundColor: SLOT_COLORS['orange'],
          },
          {
            label: data[0][3].variable,
            data: data[3].map((d) => d.avg_value),
            backgroundColor: SLOT_COLORS['green'],
          },
        ],
      } as ChartConfiguration<'bar'>['data'];
    })
  );

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
}
