import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { ScenarioState } from '../scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { OverlayLoaderComponent, SectionComponent } from '@styleguide';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import {
  getPlanPath,
  parseResultsToProjectAreas,
} from '@app/plan/plan-helpers';
import { ActivatedRoute, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { ScenarioDashboardFooterComponent } from '../scenario-dashboard-footer/scenario-dashboard-footer.component';
import {
  isPlanningApproachSubUnits,
  suggestUniqueName,
} from '../scenario-helper';
import { Scenario } from '@app/types';
import { ProjectAreasComponent } from '@app/plan/project-areas/project-areas.component';
import { catchError, map, of, take } from 'rxjs';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { ScenarioMinimalMapComponent } from '@app/maplibre-map/scenario-minimal-map/scenario-minimal-map.component';
import { ScenarioFailureComponent } from '../scenario-failure/scenario-failure.component';
import { ScenarioService } from '@app/services';
import { ScenarioSetupModalComponent } from '../scenario-setup-modal/scenario-setup-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { ScenarioToolsComponent } from '@scenario/scenario-tools/scenario-tools.component';

@UntilDestroy()
@Component({
  selector: 'app-scenario-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    DashboardLayoutComponent,
    NavBarComponent,
    DetailsCardComponent,
    OverlayLoaderComponent,
    MatMenuModule,
    ScenarioDashboardFooterComponent,
    ProjectAreasComponent,
    SectionComponent,
    ScenarioMinimalMapComponent,
    ScenarioFailureComponent,
    ScenarioToolsComponent,
  ],
  templateUrl: './scenario-dashboard.component.html',
  styleUrl: './scenario-dashboard.component.scss',
  providers: [NewScenarioState],
})
export class ScenarioDashboardComponent implements OnInit {
  currentScenario$ = this.scenarioState.currentScenario$;
  currentPlan$ = this.planState.currentPlan$;
  loadingPlan$ = this.planState.isPlanLoading$;
  loadingScenario$ = this.scenarioState.isScenarioLoading$;
  planId = this.route.parent?.snapshot.data['planId'];
  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;
  projectAreas$ = this.currentScenario$.pipe(
    map((scenario) => {
      if (!scenario.scenario_result) {
        return null;
      }
      return parseResultsToProjectAreas(scenario.scenario_result);
    })
  );

  isLoadingDialog = false;

  constructor(
    private scenarioState: ScenarioState,
    private planState: PlanState,
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Planning Area Overview',
      backUrl: getPlanPath(this.planId),
    });
  }

  isPlanningApproachSubUnits(scenario: Scenario) {
    return isPlanningApproachSubUnits(
      scenario.planning_approach || 'OPTIMIZE_PROJECT_AREAS'
    );
  }

  onToolClick(route: string): void {
    const planId = this.route.snapshot.data['planId'];
    if (planId) {
      this.breadcrumbService.updateBreadCrumb({
        label: 'Scenario Dashboard',
        backUrl: `../dashboard`,
      });
      this.router.navigate([route], { relativeTo: this.route });
    }
  }

  scenarioHasFailed(scenario: Scenario) {
    const status = scenario.scenario_result?.status;
    return status === 'FAILURE' || status === 'PANIC' || status === 'TIMED_OUT';
  }

  scenarioStatus(scenario: Scenario) {
    return scenario.scenario_result?.status || 'PENDING';
  }

  handleTryAgain(scenario: Scenario) {
    this.isLoadingDialog = true;
    this.scenarioService
      .getScenariosForPlan(this.planId)
      .pipe(
        take(1),
        map((scenarios) => scenarios.map((s) => s.name)),
        catchError((error) => {
          return of([]);
        })
      )
      .subscribe((existingNames: string[]) => {
        const suggestedName =
          existingNames.length > 0
            ? suggestUniqueName(scenario.name, existingNames)
            : '';
        this.isLoadingDialog = false;
        this.dialog.open(ScenarioSetupModalComponent, {
          maxWidth: '560px',
          data: {
            planId: this.planId,
            defaultName: suggestedName,
            fromClone: true,
            scenario: scenario,
            type: scenario.type,
          },
        });
      });
  }
}
