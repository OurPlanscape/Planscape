import { Component } from '@angular/core';
import {
  ProjectAreaReport,
  ProjectTotalReport,
} from '../project-areas/project-areas.component';
import { generateDummyData, generateDummyReport } from './temp-helper';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent {
  // TODO this data is a placeholder.
  areas: ProjectAreaReport[] = generateDummyReport();
  total: ProjectTotalReport = {
    acres: 983,
    percentTotal: 32.2,
    estimatedCost: '$432k',
  };

  data = generateDummyData();
  // start with the first 4 as selected
  selectedCharts = this.data.slice(0, 4);
}
