import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { ScenarioResult } from '@types';
import { hasAnalytics, parseResultsToProjectAreas } from '../plan-helpers';
import { FileSaverService, ScenarioService } from '@services';
import { getSafeFileName } from '../../shared/files';
import { FeatureService } from '../../features/feature.service';

@Component({
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
    private featureService: FeatureService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);
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
