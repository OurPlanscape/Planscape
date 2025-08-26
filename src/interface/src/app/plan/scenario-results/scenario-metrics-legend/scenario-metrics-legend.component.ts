import { Component, Input, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { CHART_COLORS } from '@shared';
import { getGroupedAttainment } from 'src/app/chart-helper';
import { ScenarioResult } from '@types';
import {
  MatCheckboxModule,
  MatCheckboxChange,
} from '@angular/material/checkbox';

@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor, MatCheckboxModule],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  chartColors = CHART_COLORS;
  metrics: string[] = [];
  selectedMetrics: Set<string> = new Set();

  ngOnInit() {
    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
    // set each metric as selected by default
    this.metrics.forEach((m) => this.selectedMetrics.add(m));
  }

  isSelected(metric: string) {
    return this.selectedMetrics.has(metric);
  }

  metricSelected() {}

  onMetricChange(event: MatCheckboxChange, metric: any) {
    console.log('here is the event from clicking:', event);
    console.log('here is the metric passed here:', metric);
    if (event.checked) {
      this.selectedMetrics.add(metric);
    } else {
      this.selectedMetrics.delete(metric);
    }
    console.log('metrics are now:', this.selectedMetrics);
  }
}
