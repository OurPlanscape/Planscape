import { Component, Input } from '@angular/core';
import { Scenario } from '@types';
import { map } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';
import { PlanState } from '../plan.state';
import { canAddTreatmentPlan } from '../permissions';

@UntilDestroy()
@Component({
  selector: 'app-uploaded-scenario-view',
  templateUrl: './uploaded-scenario-view.component.html',
  styleUrl: './uploaded-scenario-view.component.scss',
})
export class UploadedScenarioViewComponent {
  constructor(private planState: PlanState) {}

  @Input() scenario?: Scenario;

  plan$ = this.planState.currentPlan$;

  showTreatmentFooter$ = this.plan$.pipe(
    map((plan) => canAddTreatmentPlan(plan))
  );
}
