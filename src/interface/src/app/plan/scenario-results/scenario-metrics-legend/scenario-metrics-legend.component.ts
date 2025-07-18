import { Component, Input, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { ChartColors } from '@shared';
import { getGroupedAttainment } from 'src/app/chart-helper';
import { ScenarioResult } from '@types';

@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  chartColors = ChartColors;
  metrics: string[] = [];

  ngOnInit() {
    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
  }
}
