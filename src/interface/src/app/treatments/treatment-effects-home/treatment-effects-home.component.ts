import { Component } from '@angular/core';
import { ToolInfoCardComponent } from '@styleguide';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { TreatmentPlansListComponent } from '../treatment-plans-list/treatment-plans-list.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { ScenarioState } from '@app/scenario/scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { Plan } from '@app/types';

@Component({
  selector: 'app-treatment-effects-home',
  standalone: true,
  imports: [AsyncPipe, DashboardLayoutComponent, NgIf, ToolInfoCardComponent, TreatmentPlansListComponent],
  templateUrl: './treatment-effects-home.component.html',
  styleUrl: './treatment-effects-home.component.scss'
})
export class TreatmentEffectsHomeComponent {

  scenarioId$ = this.scenarioState.currentScenarioId$;

  currentPlan!:Plan;


constructor(
  private scenarioState: ScenarioState,
  private planState: PlanState,

)
{

      this.planState.currentPlan$
        .subscribe((plan: Plan) => {
          this.currentPlan = plan;
        });
  



}

}
