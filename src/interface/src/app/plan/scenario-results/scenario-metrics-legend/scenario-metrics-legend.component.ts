import { Component, Input, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import {
  CustomChartDataset,
  getChartDatasetsFromFeatures,
} from 'src/app/chart-helper';
import { ScenarioResult } from '@types';

@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult | null;

  metrics: CustomChartDataset[] = [];

  ngOnInit() {
    if (this.scenarioResult) {
      this.metrics = getChartDatasetsFromFeatures(
        this.scenarioResult.result.features
      );
    }
  }
}
