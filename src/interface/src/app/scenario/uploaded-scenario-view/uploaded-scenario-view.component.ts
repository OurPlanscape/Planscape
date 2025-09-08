import { Component, Input } from '@angular/core';
import { Scenario } from '@types';
import { map } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TreatmentsTabComponent } from 'src/app/scenario/treatments-tab/treatments-tab.component';
import { NewTreatmentFooterComponent } from 'src/app/scenario/new-treatment-footer/new-treatment-footer.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { PlanState } from 'src/app/plan/plan.state';
import { canAddTreatmentPlan } from 'src/app/plan/permissions';

@UntilDestroy()
@Component({
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    TreatmentsTabComponent,
    NewTreatmentFooterComponent,
  ],
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
