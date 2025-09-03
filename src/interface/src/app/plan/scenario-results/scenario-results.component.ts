import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { ScenarioGoal, ScenarioResult } from '@types';
import { hasAnalytics, parseResultsToProjectAreas } from '../plan-helpers';
import { FileSaverService, ScenarioService, TreatmentGoalsService } from '@services';
import { getSafeFileName } from '../../shared/files';
import { FeatureService } from '../../features/feature.service';
import { map } from 'rxjs';

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
  @Input() treatmentGoal: any;

  areas: ProjectAreaReport[] = [];

  goalPriorities: string[] = [];

  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService,
    private featureService: FeatureService,
    private treatmentGoalsService: TreatmentGoalsService
  ) { 
  }

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);
      this.getPriorities();
    }
  }


  getPriorities() {
    console.log('are we calling getPriorities? ');
    if (this.treatmentGoal) {
      console.log('we have a goal?', this.treatmentGoal);
      this.treatmentGoalsService
        .getTreatmentGoal(
          this.treatmentGoal.id
        ).pipe(
          map((goal: ScenarioGoal) => {
            console.log('goal?', goal);
          }),
        );
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
