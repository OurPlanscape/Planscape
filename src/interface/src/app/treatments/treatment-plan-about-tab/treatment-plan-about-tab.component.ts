import { Component, OnInit } from '@angular/core';
import { AsyncPipe, NgIf, DecimalPipe } from '@angular/common';
import { TreatmentsState } from '../treatments.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Scenario } from '@types';
import { ScenarioService } from '@services';

//TODO: remove this component

@UntilDestroy()
@Component({
  selector: 'app-treatment-plan-about-tab',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, NgIf],
  templateUrl: './treatment-plan-about-tab.component.html',
  styleUrl: './treatment-plan-about-tab.component.scss',
})
export class TreatmentPlanAboutTabComponent implements OnInit {
  constructor(
    private treatmentsState: TreatmentsState,
    private scenarioService: ScenarioService
  ) { }
  summary$ = this.treatmentsState.summary$;
  scenarioId = this.treatmentsState.getScenarioId();
  areaAcres: number | undefined = undefined;
  standSize: string | undefined = undefined;

  ngOnInit(): void {
    if (this.scenarioId) {
      this.loadScenario(this.scenarioId);
    }
  }

  loadScenario(scenarioId: number) {
    this.scenarioService
      .getScenario(scenarioId.toString())
      .pipe(untilDestroyed(this))
      .subscribe((scenario: Scenario) => {
        this.standSize = scenario.configuration?.stand_size;
        this.areaAcres = scenario.scenario_result?.result.features
          .map((featureCollection) => featureCollection.properties.area_acres)
          .reduce((acc: number, acres) => {
            return acc + acres;
          });
      });
  }
}
