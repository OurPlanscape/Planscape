import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { ScenarioResult } from '../../types';
import { parseResultsToProjectAreas } from '../plan-helpers';
import { ScenarioService } from '../../services/scenario.service';
import { FileSaverService } from '../../services/file-saver.service';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent implements OnChanges {
  @Input() scenarioId!: string;
  @Input() scenarioName = 'scenario_results';
  @Input() results: ScenarioResult | null = null;
  @Input() scenarioChartData: any[] = [];
  @Input() priorities: string[] = [];

  areas: ProjectAreaReport[] = [];
  data: any[] = [];
  selectedCharts: any[] = [];

  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);
      this.data = this.scenarioChartData;
      this.selectedCharts = this.data.slice(0, 4);
    }
  }

  downloadCsv() {
    const filename = this.scenarioName + ' csv';
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
    const filename = this.scenarioName + ' shapefiles';
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
