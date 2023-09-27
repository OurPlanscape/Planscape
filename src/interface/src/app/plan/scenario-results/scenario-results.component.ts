import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
// import { generateDummyData } from './temp-helper';
import { Scenario, ScenarioResult } from '../../types';
import { PlanService } from 'src/app/services';
import { take } from 'rxjs';
// import { BehaviorSubject, take } from 'rxjs';
// import { ChartData } from 'chart.js';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent implements OnChanges {
  @Input() scenario: Scenario | null = null;

  areas: ProjectAreaReport[] = [];
  scenarioOutputFieldsConfigs: any = {};

  labels: string[][] = [];
  data: any[] = [];
  selectedCharts: any[] = [];

  constructor(private planService: PlanService) {}
  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.scenario?.scenario_result) {
      this.areas = this.parseResultsToProjectAreas(this.scenario?.scenario_result);
      var scenario_output_fields_paths =
        this.scenario.configuration.treatment_question
          ?.scenario_output_fields_paths!;
      this.planService
        .getMetricData(scenario_output_fields_paths)
        .pipe(take(1))
        .subscribe((metric_data) => {
          this.scenarioOutputFieldsConfigs = metric_data;
          for (let metric in this.scenarioOutputFieldsConfigs) {
            var displayName =
              this.scenarioOutputFieldsConfigs[metric]['display_name'];
            var dataUnits =
              this.scenarioOutputFieldsConfigs[metric]['data_units'];
            this.labels.push([displayName, dataUnits]);
          }
          // TODO Replace values with real scenario result values
          this.data = this.labels.map((label, i) => ({
            label: label[0],
            measurement: label[1],
            values: Array.from({ length: 5 }, () =>
              Math.floor(Math.random() * 10)
            ),
          }));
          // start with the first 4 as selected
          this.selectedCharts = this.data.slice(0, 4);
        });
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
