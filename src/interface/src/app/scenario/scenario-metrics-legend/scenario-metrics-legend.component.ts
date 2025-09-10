import { Component, Input, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { getGroupedAttainment } from 'src/app/chart-helper';
import { ScenarioResult } from '@types';
import { ScenarioResultsChartsService } from '../scenario-results-charts.service';

@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  metrics: string[] = [];
  assignedColors: { [name: string]: string } = {};

  constructor(private chartService: ScenarioResultsChartsService) {}

  ngOnInit() {
    this.assignedColors = this.chartService.getAssignedColors();

    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
  }
}
