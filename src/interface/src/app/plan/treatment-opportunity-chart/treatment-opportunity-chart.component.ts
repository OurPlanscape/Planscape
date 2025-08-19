import { Component, Input, OnInit } from '@angular/core';
import { ScenarioResult } from '@types';
import { ChartData, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
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

@Component({
  selector: 'app-treatment-opportunity-chart',
  standalone: true,
  imports: [NgChartsModule, ChartComponent],
  templateUrl: './treatment-opportunity-chart.component.html',
  styleUrl: './treatment-opportunity-chart.component.scss',
})
export class TreatmentOpportunityChartComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;

  public barChartType: 'bar' = 'bar';

  public barChartData!: ChartData<'bar', number[], string>;

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
  }
}
