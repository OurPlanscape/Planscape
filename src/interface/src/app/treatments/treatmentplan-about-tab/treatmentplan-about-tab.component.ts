import { Component, OnInit } from '@angular/core';
import { AsyncPipe, NgIf, DecimalPipe } from '@angular/common';
import { TreatmentsState } from '../treatments.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Scenario } from '@types';
import { ScenarioService } from '@services';

@UntilDestroy()
@Component({
  selector: 'app-treatmentplan-about-tab',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, NgIf],
  templateUrl: './treatmentplan-about-tab.component.html',
  styleUrl: './treatmentplan-about-tab.component.scss',
})
export class TreatmentplanAboutTabComponent implements OnInit {
  constructor(
    private treatmentsState: TreatmentsState,
    private scenarioService: ScenarioService
  ) {}
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
        //TODO: confirm that this is actually the acres value we want to display- not planning area acres
        // this is calculating from scenario_result, just as we do in the result table
        this.areaAcres = scenario.scenario_result?.result.features
          .map((featureCollection) => featureCollection.properties.area_acres)
          .reduce((acc: number, acres) => {
            return acc + acres;
          });
      });
  }
}
