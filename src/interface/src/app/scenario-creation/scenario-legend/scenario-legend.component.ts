import { Component } from '@angular/core';
import { combineLatest, map } from 'rxjs';

import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonComponent } from '@styleguide';

import { NewScenarioState } from 'src/app/scenario-creation/new-scenario.state';
import { AsyncPipe, DecimalPipe, NgIf, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-scenario-legend',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    MatTooltipModule,
    ButtonComponent,
    NgIf,
    PercentPipe,
  ],
  templateUrl: './scenario-legend.component.html',
  styleUrl: './scenario-legend.component.scss',
})
export class ScenarioLegendComponent {
  summary$ = this.newScenarioState.availableStands$.pipe(map((s) => s.summary));

  stepIndex$ = this.newScenarioState.stepIndex$;

  showExcludedStands$ = combineLatest([
    this.stepIndex$,
    this.newScenarioState.hasExcludedStands$,
  ]).pipe(
    map(([step, hasExcluded]) => {
      return hasExcluded && step === 1;
    })
  );

  showConstrainedStands$ = combineLatest([
    this.stepIndex$,
    this.newScenarioState.hasConstrainedStands$,
  ]).pipe(
    map(([step, hasExcluded]) => {
      return hasExcluded && step > 1;
    })
  );

  treatablePercent$ = this.newScenarioState.availableStands$.pipe(
    map((s) => s.summary.treatable_area / s.summary.available_area)
  );

  showAvailablePercent$ = this.stepIndex$.pipe(map((s) => s > 1));

  constructor(private newScenarioState: NewScenarioState) {}
}
