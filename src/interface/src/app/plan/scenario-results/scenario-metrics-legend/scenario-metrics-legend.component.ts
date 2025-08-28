import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgFor, NgIf} from '@angular/common';
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
  imports: [NgFor, NgIf, MatCheckboxModule],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  @Input() selectedMetrics!: Set<string>;
  @Output() handleCheckbox = new EventEmitter<MatCheckboxChange>();

  chartColors = CHART_COLORS;
  metrics: string[] = [];
  priorities: string[] = [];

  ngOnInit() {
    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
  }

  isSelected(metric: string) {
    if (this.selectedMetrics) {
      return this.selectedMetrics.has(metric);
    }
    return false;
  }

  metricSelected(event: MatCheckboxChange) {
    this.handleCheckbox.emit(event);
  }
}
