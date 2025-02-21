import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { ScenarioResult } from '@types';
import { parseResultsToProjectAreas } from '../plan-helpers';
import { FileSaverService, ScenarioService } from '@services';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent implements OnChanges {
  @Input() scenarioId!: string;
  @Input() scenarioName = 'scenario_results';
  @Input() results: ScenarioResult | null = null;
  @Input() priorities: string[] = [];

  areas: ProjectAreaReport[] = [];

  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);
    }
  }

  downloadCsv() {
    const filename = this.scenarioName.replace(/[\s./\\]/g, '_') + '_csv.zip';
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
    const filename = this.scenarioName.replace(/[\s./\\/]/g, '_') + '_shp.zip';
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
}
