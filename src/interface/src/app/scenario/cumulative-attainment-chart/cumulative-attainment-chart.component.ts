import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ScenarioResult } from '@types';
import { processCumulativeAttainment } from '../../plan/plan-helpers';
import {
  ChartDataset,
  ChartOptions,
  InteractionMode,
  TooltipItem,
} from 'chart.js';
import {
  getChartBorderDash,
  getChartFontConfig,
  getDarkGridConfig,
  chartTooltipBaseConfig,
} from '../../chart-helper';
import { ChartComponent } from '@styleguide';
import { ScenarioResultsChartsService } from 'src/app/scenario/scenario-results-charts.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-cumulative-attainment-chart',
  standalone: true,
  imports: [AsyncPipe, NgChartsModule, ChartComponent],
  templateUrl: './cumulative-attainment-chart.component.html',
  styleUrl: './cumulative-attainment-chart.component.scss',
})
export class CumulativeAttainmentChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  @Input() selectedMetrics!: Set<string> | null;

  constructor(private chartService: ScenarioResultsChartsService) {
    this.chartService.displayedMetrics$
      .pipe(untilDestroyed(this))
      .subscribe((metrics: Set<string>) => {
        this.updateDisplayedMetrics(metrics);
      });
  }
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
        ...chartTooltipBaseConfig(),
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

  allData: { labels: number[]; datasets: ChartDataset[] } = {
    labels: [],
    datasets: [],
  };
  selectedData$: BehaviorSubject<any> = new BehaviorSubject({});

  ngOnInit(): void {
    const d = processCumulativeAttainment(this.scenarioResult.result.features);
    this.allData.labels = d.area.map((data) => Math.round(data));
    this.allData.datasets = d.datasets.map((data) => {
      return {
        ...data,
        ...this.colorForLabel(data.label),
        pointRadius: 0, // Hides the circles
      };
    });
    this.selectedData$.next(structuredClone(this.allData));
  }

  colorForLabel(label: string) {
    return {
      backgroundColor: this.chartService.getOrAddColor(label),
      borderColor: this.chartService.getOrAddColor(label),
      pointBackgroundColor: this.chartService.getOrAddColor(label),
      pointBorderColor: this.chartService.getOrAddColor(label),
    };
  }

  updateDisplayedMetrics(metrics: Set<string>) {
    const selectedData = {
      ...this.allData,
      datasets: this.allData.datasets.filter(
        (d: ChartDataset) => d.label && metrics.has(d.label)
      ),
    };
    this.selectedData$.next(selectedData);
  }
}
