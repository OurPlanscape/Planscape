import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { getGroupedAttainment } from '@app/chart-helper';
import { ScenarioResult, UsageType } from '@types';
import {
  MatCheckboxModule,
  MatCheckboxChange,
} from '@angular/material/checkbox';
import { ScenarioResultsChartsService } from '../scenario-results-charts.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor, NgIf, MatCheckboxModule],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  @Input() scenarioId!: number;
  @Input() usageTypes: UsageType[] | null = [];

  @Output() handleCheckbox = new EventEmitter<MatCheckboxChange>();
  assignedColors: { [name: string]: string } = {};

  selectedMetrics!: Set<string> | null;

  metrics: string[] = [];

  priorities: string[] = [];
  cobenefits: string[] = [];

  constructor(private chartService: ScenarioResultsChartsService) {}

  ngOnInit() {
    this.assignedColors = this.chartService.getAssignedColors();

    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
    this.chartService.initDisplayedMetrics(this.metrics);
    this.metrics.forEach((m) => this.chartService.getOrAddColor(m));

    this.chartService.displayedMetrics$
      .pipe(untilDestroyed(this))
      .subscribe((m) => {
        this.selectedMetrics = m;
      });

    if (this.usageTypes && this.usageTypes?.length > 0) {
      this.divideMetricsIntoUsageTypes();
    }
  }

  // divide metrics into priorities and cobenefits,
  // based on usage types for scenario treatment goal
  divideMetricsIntoUsageTypes() {
    this.priorities = [];
    this.cobenefits = [];
    const priorityLayers = this.usageTypes
      ?.filter((ut) => ut.usage_type === 'PRIORITY')
      .map((m) => m.datalayer);
    this.metrics.forEach((m: string) => {
      if (priorityLayers?.includes(m)) {
        this.priorities.push(m);
      } else {
        this.cobenefits.push(m);
      }
    });
    //sort these alphabetically
    this.priorities.sort();
    this.cobenefits.sort();
  }

  isSelected(metric: string) {
    if (this.selectedMetrics) {
      return this.selectedMetrics.has(metric);
    }
    return false;
  }

  handleCheckboxChange(event: MatCheckboxChange) {
    this.chartService.updateDisplayedMetrics(event.checked, event.source.value);
  }
}
