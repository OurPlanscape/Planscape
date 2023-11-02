import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { ScenarioResult } from '../../types';
import { parseResultsToProjectAreas } from '../plan-helpers';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent implements OnChanges {
  @Input() results: ScenarioResult | null = null;
  @Input() scenarioChartData: any[] = [];
  @Output() downloadCsv = new EventEmitter();

  areas: ProjectAreaReport[] = [];
  scenarioOutputFieldsConfigs: any = {};
  data: any[] = [];
  selectedCharts: any[] = [];

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);
      this.data = this.scenarioChartData;
      this.selectedCharts = this.data.slice(0, 4);
    }
  }
}
