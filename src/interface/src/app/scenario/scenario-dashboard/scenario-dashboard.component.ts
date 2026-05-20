import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { ScenarioState } from '../scenario.state';
import { PlanState } from '@app/plan/plan.state';
import {
  ButtonComponent,
  OverlayLoaderComponent,
  SectionComponent,
  TileButtonComponent,
} from '@styleguide';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import {
  getPlanPath,
  parseResultsToProjectAreas,
} from '@app/plan/plan-helpers';
import { ActivatedRoute, Router } from '@angular/router';
import { ScenarioDownloadFooterComponent } from '../scenario-download-footer/scenario-download-footer.component';
import { MatMenuModule } from '@angular/material/menu';
import { ScenarioConfigOverlayComponent } from '../scenario-config-overlay/scenario-config-overlay.component';
import { LegacyScenarioConfigOverlayComponent } from '../legacy-scenario-config-overlay/legacy-scenario-config-overlay.component';
import { ScenarioDashboardFooterComponent } from '../scenario-dashboard-footer/scenario-dashboard-footer.component';
import { isPlanningApproachSubUnits } from '../scenario-helper';
import { Scenario } from '@app/types';
import { ProjectAreasComponent } from '@app/plan/project-areas/project-areas.component';
import { map } from 'rxjs';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { ScenarioMinimalMapComponent } from '@app/maplibre-map/scenario-minimal-map/scenario-minimal-map.component';

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
    TileButtonComponent,
    OverlayLoaderComponent,
    ScenarioDownloadFooterComponent,
    ButtonComponent,
    MatMenuModule,
    ScenarioConfigOverlayComponent,
    LegacyScenarioConfigOverlayComponent,
    ScenarioDashboardFooterComponent,
    ProjectAreasComponent,
    SectionComponent,
    ScenarioMinimalMapComponent,
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

  scenarioDashboardTools = [
    {
      id: 'treatment-effects',
      backgroundImage: '/assets/svg/treatment-effects.svg',
      backgroundColor: '#dfede6',
      title: 'Treatment Effects',
      featureFlag: '',
      enabled: true,
    },
    {
      id: 'coming-soon',
      backgroundImage: '/assets/svg/lock.svg',
      title: 'Coming Soon',
      featureFlag: '',
      enabled: false,
    },
  ];

  constructor(
    private scenarioState: ScenarioState,
    private planState: PlanState,
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute,
    private router: Router
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

  onToolClick(toolId: string): void {
    if (toolId === 'treatment-effects') {
      const planId = this.route.snapshot.data['planId'];
      if (planId) {
        this.breadcrumbService.updateBreadCrumb({
          label: 'Scenario Dashboard',
          backUrl: `../dashboard`,
        });
        this.router.navigate(['../treatment'], { relativeTo: this.route });
      }
    }
  }
}
