import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ScenarioResult, UsageType } from '@types';
import { ChartData, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import {
  CustomChartDataset,
  getChartBorderDash,
  getChartDatasetsFromFeatures,
  getChartFontConfig,
  getDarkGridConfig,
  getProjectAreaLabelsFromFeatures,
  chartTooltipBaseConfig,
} from '@app/chart-helper';
import { ChartComponent } from '@styleguide';
import { ScenarioResultsChartsService } from '@app/scenario/scenario-results-charts.service';
import { BehaviorSubject } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-treatment-opportunity-chart',
  standalone: true,
  imports: [AsyncPipe, NgChartsModule, ChartComponent],
  templateUrl: './treatment-opportunity-chart.component.html',
  styleUrl: './treatment-opportunity-chart.component.scss',
})
export class TreatmentOpportunityChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  @Input() usageTypes: UsageType[] | null = [];

  public barChartType: 'bar' = 'bar';

  public barChartData!: ChartData<'bar', number[], string>;
  selectedData$: BehaviorSubject<any> = new BehaviorSubject(this.barChartData);

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        ...chartTooltipBaseConfig(),
        callbacks: {
          title: (items) => {
            const dataset = items[0]?.dataset as CustomChartDataset;
            return dataset?.extraInfo ? `${dataset?.extraInfo}:` : '';
          },
          label: (item) => {
            const value = item.parsed.y;
            return `${value} %`;
          },
        },
      },
      datalabels: {
        font: {
          ...getChartFontConfig(),
          size: 10,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: false,
        },
        stacked: true,
        ticks: {
          padding: 0,
          color: '#4A4A4A',
        },
        grid: {
          drawOnChartArea: false, // ✅ disables full grid lines
          drawTicks: true,
          tickColor: 'black',
          borderColor: 'black',
        },
      },
      y: {
        title: {
          display: false,
        },
        stacked: true,
        // min: 0,  // TODO: Min should be 0 once we fix negative numbers
        grid: {
          borderDash: getChartBorderDash(),
          ...getDarkGridConfig(),
        },
        ticks: {
          padding: 5,
          maxTicksLimit: 5,
          color: '#4A4A4A',
        },
      },
    },
  };

  constructor(private chartService: ScenarioResultsChartsService) {}

  ngOnInit(): void {
    const chartDatasets = getChartDatasetsFromFeatures(
      this.scenarioResult.result.features,
      this.usageTypes ?? []
    );
    //assign colors from color service
    chartDatasets.map((r) => {
      r.backgroundColor = this.chartService.getOrAddColor(r.extraInfo ?? '');
    });
    this.barChartData = {
      labels: getProjectAreaLabelsFromFeatures(
        this.scenarioResult.result.features
      ),
      datasets: chartDatasets.reverse(), // the chart is apparently drawn from bottom to top
    };

    const selectedData = {
      ...this.barChartData,
      datasets: this.barChartData.datasets,
    };
    this.selectedData$.next(selectedData);

    this.chartService.displayedMetrics$
      .pipe(untilDestroyed(this))
      .subscribe((metrics: Set<string>) => {
        this.updateDisplayedMetrics(metrics);
      });
  }

  updateDisplayedMetrics(metrics: Set<string>) {
    const selectedData = {
      ...this.barChartData,
      datasets: this.barChartData.datasets.filter(
        (d: CustomChartDataset) => d.extraInfo && metrics.has(d.extraInfo)
      ),
    };
    this.selectedData$.next(selectedData);
  }
}
