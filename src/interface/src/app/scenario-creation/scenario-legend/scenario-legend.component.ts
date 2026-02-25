import { Component } from '@angular/core';
import { combineLatest, map } from 'rxjs';

import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonComponent } from '@styleguide';

import { NewScenarioState } from '../new-scenario.state';
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

  showExcludedStands$ = combineLatest([
    this.newScenarioState.currentStep$,
    this.newScenarioState.hasExcludedStands$,
  ]).pipe(
    map(([step, hasExcluded]) => {
      return (
        hasExcluded && !!step?.includeExcludedAreas && !step?.includeConstraints
      );
    })
  );

  showConstrainedStands$ = combineLatest([
    this.newScenarioState.currentStep$,
    this.newScenarioState.hasConstrainedStands$,
  ]).pipe(
    map(([step, hasExcluded]) => {
      return hasExcluded && !!step?.includeConstraints;
    })
  );

  treatablePercent$ = this.newScenarioState.availableStands$.pipe(
    map((s) => s.summary.treatable_area / s.summary.available_area)
  );

  showAvailablePercent$ = this.newScenarioState.currentStep$.pipe(
    map((s) => !!s?.includeExcludedAreas)
  );

  constructor(private newScenarioState: NewScenarioState) {}
}
