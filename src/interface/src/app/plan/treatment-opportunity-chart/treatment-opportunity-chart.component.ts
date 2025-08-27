import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ScenarioResult } from '@types';
import { ChartData, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ScenarioMetricsLegendComponent } from '../scenario-results/scenario-metrics-legend/scenario-metrics-legend.component';
import {
  CustomChartDataset,
  getChartBorderDash,
  getChartDatasetsFromFeatures,
  getChartFontConfig,
  getDarkGridConfig,
  getProjectAreaLabelsFromFeatures,
  whiteTooltipBaseConfig,
} from 'src/app/chart-helper';
import { ChartComponent } from '@styleguide';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-treatment-opportunity-chart',
  standalone: true,
  imports: [
    AsyncPipe,
    NgChartsModule,
    ChartComponent,
    ScenarioMetricsLegendComponent,
  ],
  templateUrl: './treatment-opportunity-chart.component.html',
  styleUrl: './treatment-opportunity-chart.component.scss',
})
export class TreatmentOpportunityChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;

  selectedMetrics: Set<string> = new Set<string>();

  public barChartType: 'bar' = 'bar';

  public barChartData!: ChartData<'bar', number[], string>;

  selectedData$: BehaviorSubject<any> = new BehaviorSubject(this.barChartData);

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        ...whiteTooltipBaseConfig(),
        titleFont: {
          ...whiteTooltipBaseConfig().titleFont,
          weight: '600',
        },
        bodyFont: {
          ...whiteTooltipBaseConfig().bodyFont,
          weight: '500',
        },
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

  ngOnInit(): void {
    this.barChartData = {
      labels: getProjectAreaLabelsFromFeatures(
        this.scenarioResult.result.features
      ),
      datasets: getChartDatasetsFromFeatures(
        this.scenarioResult.result.features
      ),
    };
    this.barChartData.datasets.forEach((dataset: any) =>
      this.selectedMetrics.add(dataset.extraInfo)
    );

    this.selectedData$.next(structuredClone(this.barChartData));
  }

  onMetricChange(event: MatCheckboxChange) {
    if (event.checked) {
      this.selectedMetrics.add(event.source.value);
    } else {
      this.selectedMetrics.delete(event.source.value);
    }
    const selectedData = {
      ...this.barChartData,
      datasets: this.barChartData.datasets.filter((d: any) =>
        this.selectedMetrics.has(d.extraInfo)
      ),
    };
    this.selectedData$.next(selectedData);
  }
}
