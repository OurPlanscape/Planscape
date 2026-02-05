import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgIf } from '@angular/common';
import { ScenarioResult, UsageType } from '@types';
import { FileSaverService, ScenarioService } from '@services';
import { getSafeFileName } from '@shared/files';
import { ScenarioResultsChartsService } from '@app/scenario/scenario-results-charts.service';
import { TreatmentOpportunityChartComponent } from '@app/scenario/treatment-opportunity-chart/treatment-opportunity-chart.component';
import { ButtonComponent, SectionComponent } from '@styleguide';
import { CumulativeAttainmentChartComponent } from '@app/scenario/cumulative-attainment-chart/cumulative-attainment-chart.component';
import {
  ProjectAreaReport,
  ProjectAreasComponent,
} from '@app/plan/project-areas/project-areas.component';
import { ScenarioMetricsLegendComponent } from '@app/scenario/scenario-metrics-legend/scenario-metrics-legend.component';
import {
  hasAnalytics,
  parseResultsToProjectAreas,
} from '@app/plan/plan-helpers';
import { getGroupedAttainment } from '@app/chart-helper';

@Component({
  standalone: true,
  imports: [
    NgIf,
    SectionComponent,
    TreatmentOpportunityChartComponent,
    ProjectAreasComponent,
    CumulativeAttainmentChartComponent,
    ScenarioMetricsLegendComponent,
    ButtonComponent,
  ],
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent implements OnChanges {
  @Input() scenarioId!: number;
  @Input() scenarioVersion!: string;
  @Input() scenarioName = 'scenario_results';
  @Input() results: ScenarioResult | null = null;
  @Input() usageTypes: UsageType[] | null = [];

  areas: ProjectAreaReport[] = [];

  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService,
    private chartService: ScenarioResultsChartsService
  ) {
    this.chartService.resetColors();
  }

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);
      if (hasAnalytics(this.results)) {
        const metrics = Object.keys(
          getGroupedAttainment(this.results.result.features)
        );
        metrics.forEach((m) => this.chartService.getOrAddColor(m));
      }
    }
  }

  downloadCsv() {
    const filename = getSafeFileName(this.scenarioName) + '_csv.zip';
    if (this.scenarioId) {
      this.scenarioService
        .downloadCsvData(this.scenarioId)
        .subscribe((data) => {
          const blob = new Blob([data], {
            type: 'application/zip',
          });
          this.fileServerService.saveAs(blob, filename);
        });
    }
  }

  downloadShapeFiles() {
    const filename = getSafeFileName(this.scenarioName) + '_shp.zip';
    if (this.scenarioId) {
      this.scenarioService
        .downloadShapeFiles(this.scenarioId)
        .subscribe((data) => {
          const blob = new Blob([data], {
            type: 'application/zip',
          });
          this.fileServerService.saveAs(blob, filename);
        });
    }
  }

  hasAnalytics() {
    let analytics = false;
    if (this.results) {
      analytics = hasAnalytics(this.results);
    }
    return analytics;
  }
}
