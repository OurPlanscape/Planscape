import { Component } from '@angular/core';
import { ToolInfoCardComponent } from '@styleguide';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { TreatmentPlansListComponent } from '../treatment-plans-list/treatment-plans-list.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { ScenarioState } from '@app/scenario/scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { TREATMENT_EFFECTS_URL, SharedModule } from '@app/shared';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';

@Component({
  selector: 'app-treatment-effects-home',
  standalone: true,
  imports: [
    AsyncPipe,
    DashboardLayoutComponent,
    NavBarComponent,
    NgIf,
    ToolInfoCardComponent,
    TreatmentPlansListComponent,
    SharedModule,
  ],
  templateUrl: './treatment-effects-home.component.html',
  styleUrl: './treatment-effects-home.component.scss',
})
export class TreatmentEffectsHomeComponent {
  scenarioId$ = this.scenarioState.currentScenarioId$;

  currentPlan$ = this.planState.currentPlan$;

  constructor(
    private scenarioState: ScenarioState,
    private planState: PlanState,
    private breadcrumbService: BreadcrumbService
  ) {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Scenario Dashboard ',
      backUrl: '../..',
    });
  }

  openTooltipLink() {
    window.open(TREATMENT_EFFECTS_URL, '_blank');
  }
}
