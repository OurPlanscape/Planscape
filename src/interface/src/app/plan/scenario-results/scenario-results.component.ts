import { Component, Input } from '@angular/core';
import {
  ProjectAreaReport,
  ProjectTotalReport,
} from '../project-areas/project-areas.component';
import { generateDummyData } from './temp-helper';
import { ScenarioResult } from '../../types';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent {
  @Input()
  results: ScenarioResult | null = null;
  areas: ProjectAreaReport[] = [];
  total: ProjectTotalReport = {
    acres: 0,
    percentTotal: 0,
    estimatedCost: 0,
  };

  data = generateDummyData();
  // start with the first 4 as selected
  selectedCharts = this.data.slice(0, 4);

  ngOnInit() {
    // parse ScenarioResult into ProjectAreaReports
    if (this.results) {
      this.areas = this.parseResultsToProjectAreas(this.results);
      this.total = this.parseResultsToTotals(this.areas);
    }
  }

  private parseResultsToProjectAreas(
    results: ScenarioResult
  ): ProjectAreaReport[] {
    return results.result.features.map((featureCollection, i) => {
      const props = featureCollection.properties;
      return {
        id: i + 1,
        acres: props.area_acres,
        percentTotal: props.pct_area,
        estimatedCost: props.cost_per_acre,
        score: props.treatment_rank,
      };
    });
  }

  private parseResultsToTotals(
    areaReports: ProjectAreaReport[]
  ): ProjectTotalReport {
    return areaReports.reduce((acc, value) => {
      acc.acres += value.acres;
      acc.estimatedCost += value.estimatedCost;
      acc.percentTotal += value.percentTotal;
      return acc;
    }, this.total);
  }
}
