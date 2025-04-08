import { Component, Input } from '@angular/core';
import { Scenario } from '@types';
import { LegacyPlanStateService } from '@services';
import { map, take } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { PlanState } from '../plan.state';
import { canAddTreatmentPlan } from '../permissions';

@UntilDestroy()
@Component({
  selector: 'app-uploaded-scenario-view',
  templateUrl: './uploaded-scenario-view.component.html',
  styleUrl: './uploaded-scenario-view.component.scss',
})
export class UploadedScenarioViewComponent {
  constructor(
    private LegacyPlanStateService: LegacyPlanStateService,
    private planState: PlanState
  ) {}

  @Input() scenario?: Scenario;

  plan$ = this.planState.currentPlan$;

  showTreatmentFooter$ = this.plan$.pipe(
    map((plan) => canAddTreatmentPlan(plan))
  );

  ngOnInit() {
    if (this.scenario) {
      this.plan$.pipe(untilDestroyed(this), take(1)).subscribe((planState) => {
        this.LegacyPlanStateService.updateStateWithScenario(
          this.scenario?.id ?? null,
          this.scenario?.name ?? null
        );
        this.LegacyPlanStateService.updateStateWithShapes(
          this.scenario?.scenario_result?.result.features
        );
      });
    }
  }
}
