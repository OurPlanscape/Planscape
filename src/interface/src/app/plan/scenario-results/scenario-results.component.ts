import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { generateDummyData } from './temp-helper';
import { ScenarioResult } from '../../types';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent implements OnChanges {
  @Input() results: ScenarioResult | null = null;

  areas: ProjectAreaReport[] = [];

  // TODO remove and use real `this.results`
  data = generateDummyData();
  // start with the first 4 as selected
  selectedCharts = this.data.slice(0, 4);

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = this.parseResultsToProjectAreas(this.results);
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
        estimatedCost: props.total_cost,
        score: props.weightedPriority,
      };
    });
  }
}
