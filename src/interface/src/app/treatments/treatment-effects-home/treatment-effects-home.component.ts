import { Component } from '@angular/core';
import { PlanState } from '@app/plan/plan.state';
import { OverlayLoaderComponent } from '@styleguide';
import { AsyncPipe, NgIf } from '@angular/common';
import { TreatmentPlansListComponent } from '../treatment-plans-list/treatment-plans-list.component';
import { ScenarioState } from '@app/scenario/scenario.state';

@Component({
  selector: 'app-treatment-effects',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    OverlayLoaderComponent,
    TreatmentPlansListComponent,
  ],
  templateUrl: './treatment-effects-home.component.html',
  styleUrl: './treatment-effects-home.component.scss',
})
export class TreatmentEffectsHomeComponent {
  currentPlan$ = this.planState.currentPlan$;
  currentScenario$ = this.scenarioState.currentScenario$;

  loading = false;

  $navBarArea$ = 'ok';

  constructor(
    private planState: PlanState,
    private scenarioState: ScenarioState
  ) {}
}
