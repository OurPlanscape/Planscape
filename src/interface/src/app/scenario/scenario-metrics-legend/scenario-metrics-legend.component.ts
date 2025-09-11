import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { getGroupedAttainment } from 'src/app/chart-helper';
import { ScenarioResult, UsageType } from '@types';
import {
  MatCheckboxModule,
  MatCheckboxChange,
} from '@angular/material/checkbox';
import { ScenarioResultsChartsService } from '../scenario-results-charts.service';
import { ScenarioService } from '@services';
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

  @Output() handleCheckbox = new EventEmitter<MatCheckboxChange>();
  assignedColors: { [name: string]: string } = {};

  selectedMetrics!: Set<string> | null;

  metrics: string[] = [];

  priorities: string[] = [];
  cobenefits: string[] = [];

  constructor(
    private chartService: ScenarioResultsChartsService,
    private scenarioService: ScenarioService
  ) {}

  ngOnInit() {
    this.assignedColors = this.chartService.getAssignedColors();

    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
    this.chartService.initDisplayedMetrics(this.metrics);
    this.metrics.forEach((m) => this.chartService.getOrAddColor(m));

    this.chartService.displayedMetrics$.subscribe((m) => {
      this.selectedMetrics = m;
    });

    if (this.scenarioId) {
      this.scenarioService
        .getScenario(this.scenarioId)
        .pipe(untilDestroyed(this))
        .subscribe((scenario) => {
          if (scenario.usage_types) {
            this.divideMetricsIntoUsageTypes(scenario.usage_types);
          }
        });
    }
  }

  // divide metrics into priorities and cobenefits,
  // based on usage types for scenario treatment goal
  divideMetricsIntoUsageTypes(usageTypes: UsageType[]) {
    this.priorities = [];
    this.cobenefits = [];
    const priorityLayers = usageTypes
      ?.filter((ut) => ut.usage_type === 'PRIORITY')
      .map((m) => m.datalayer);
    this.metrics.forEach((m: string) => {
      if (priorityLayers?.includes(m)) {
        this.priorities.push(m);
      } else {
        this.cobenefits.push(m);
      }
    });
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
