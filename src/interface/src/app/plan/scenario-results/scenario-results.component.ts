import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { ScenarioResult } from '../../types';
import { parseResultsToProjectAreas } from '../plan-helpers';
import { ScenarioService } from '@services';
import { FileSaverService } from '@services/file-saver.service';
import { ChartData } from '../project-areas-metrics/chart-data';

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

  groupedData: { [category: string]: ChartData[] } | null = null;

  selectedCharts: any[] = [];

  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);

      this.groupedData = this.scenarioChartData
        .sort((a, b) => {
          if (a.label < b.label) {
            return -1;
          }
          if (a.label > b.label) {
            return 1;
          }
          return 0;
        })
        .reduce((categories, data) => {
          const category = data.isPrimary
            ? 'Primary Metrics'
            : 'Secondary Metrics';
          categories[category] = categories[category] ?? [];
          categories[category].push(data);
          return categories;
        }, {});
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
