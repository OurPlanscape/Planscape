import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ScenarioResult } from '@types';
import { FileSaverService, ScenarioService } from '@services';
import { getSafeFileName } from '../../shared/files';
import { FeatureService } from '../../features/feature.service';
import { ScenarioResultsChartsService } from 'src/app/scenario/scenario-results-charts.service';
import { TreatmentOpportunityChartComponent } from '../treatment-opportunity-chart/treatment-opportunity-chart.component';
import { NgIf } from '@angular/common';
import { SectionComponent } from '@styleguide';
import { CumulativeAttainmentChartComponent } from '../cumulative-attainment-chart/cumulative-attainment-chart.component';
import {
  ProjectAreaReport,
  ProjectAreasComponent,
} from 'src/app/plan/project-areas/project-areas.component';
import { ScenarioMetricsLegendComponent } from '../scenario-metrics-legend/scenario-metrics-legend.component';
import {
  hasAnalytics,
  parseResultsToProjectAreas,
} from 'src/app/plan/plan-helpers';
import { getGroupedAttainment } from 'src/app/chart-helper';

@Component({
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    SectionComponent,
    TreatmentOpportunityChartComponent,
    ProjectAreasComponent,
    CumulativeAttainmentChartComponent,
    ScenarioMetricsLegendComponent,
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
  @Input() priorities: string[] = [];

  areas: ProjectAreaReport[] = [];

  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService,
    private featureService: FeatureService,
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

  isScenarioImprovementsEnabled() {
    let analytics = false;
    const isFlagEnabled = this.featureService.isFeatureEnabled(
      'SCENARIO_IMPROVEMENTS'
    );
    if (this.results) {
      analytics = hasAnalytics(this.results);
    }

    return isFlagEnabled && analytics;
  }
}
