import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProjectAreaReport } from '../project-areas/project-areas.component';
import { ScenarioGoal, ScenarioResult } from '@types';
import { hasAnalytics, parseResultsToProjectAreas } from '../plan-helpers';
import { FileSaverService, ScenarioService, TreatmentGoalsService } from '@services';
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
  @Input() priorities: string[] = []; // TODO: is this just for old scenarios? can we use this?
  @Input() treatmentGoal: any | null = null; // TODO: type


  goalPriorities : string[] | null = null;
  areas: ProjectAreaReport[] = [];

  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService,
    private featureService: FeatureService,
    private treatmentGoalService: TreatmentGoalsService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // parse ScenarioResult
    if (this.results) {
      this.areas = parseResultsToProjectAreas(this.results);
      this.loadGoalPriorities();
    }
  }

  // TODO: 
  loadGoalPriorities() {
    console.log('called LoadGoalPriorities?');
     console.log('we have some priorities already?', this.goalPriorities);
    if (this.treatmentGoal && this.goalPriorities === null) {
      console.log('calling tx goal endpoint...');
      this.treatmentGoalService.getTreatmentGoal(this.treatmentGoal.id).subscribe((goal : ScenarioGoal) => {
        this.goalPriorities = goal.priorities;
        console.log('here are the priorities:', goal.priorities);
      })
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
