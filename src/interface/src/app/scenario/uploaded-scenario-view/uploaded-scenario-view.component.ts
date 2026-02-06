import { Component, Input } from '@angular/core';
import { Scenario } from '@types';
import { map, Observable } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TreatmentsTabComponent } from '@scenario/treatments-tab/treatments-tab.component';
import { NewTreatmentFooterComponent } from '@scenario/new-treatment-footer/new-treatment-footer.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { PlanState } from '@plan/plan.state';
import { userCanAddTreatmentPlan } from '@plan/permissions';
import { scenarioCanHaveTreatmentPlans } from '../scenario-helper';
import { ScenarioState } from '../scenario.state';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { getPlanPath } from '@plan/plan-helpers';
import { ActivatedRoute } from '@angular/router';

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
  scenario$: Observable<Scenario> = this.scenarioState.currentScenario$;
  planId = this.route.snapshot.parent?.data['planId'];

  constructor(
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute
  ) {
    this.scenario$.pipe(untilDestroyed(this)).subscribe((s) => {
      this.breadcrumbService.updateBreadCrumb({
        label: 'Scenario: ' + s.name,
        backUrl: getPlanPath(this.planId),
      });
    });
  }

  @Input() scenario?: Scenario;

  plan$ = this.planState.currentPlan$;

  scenarioCanHaveTreatmentPlans(scenario: Scenario | undefined) {
    return scenarioCanHaveTreatmentPlans(scenario);
  }

  showTreatmentFooter$ = this.plan$.pipe(
    map((plan) => userCanAddTreatmentPlan(plan))
  );
}
