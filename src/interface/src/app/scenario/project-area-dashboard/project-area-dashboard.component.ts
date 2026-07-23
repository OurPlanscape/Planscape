import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { PlanState } from '@app/plan/plan.state';
import { OverlayLoaderComponent } from '@styleguide';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { getPlanPath } from '@app/plan/plan-helpers';
import { ActivatedRoute, Router } from '@angular/router';
import { MapViewerCardComponent } from '@app/plan/map-viewer-card/map-viewer-card.component';
import { ProjectAreaComingSoonComponent } from '../project-area-coming-soon/project-area-coming-soon.component';
import { ScenarioState } from '../scenario.state';
import { ScenarioToolsComponent } from '@scenario/scenario-tools/scenario-tools.component';
import { ProjectAreasEmptyListComponent } from '../project-areas-empty-list/project-areas-empty-list.component';
import { FeaturesModule } from '@features/features.module';
import { ProjectAreaScenariosListComponent } from '../project-area-scenarios-list/project-area-scenarios-list.component';

@UntilDestroy()
@Component({
  selector: 'app-project-area-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FeaturesModule,
    SharedModule,
    DashboardLayoutComponent,
    MapViewerCardComponent,
    NavBarComponent,
    DetailsCardComponent,
    ProjectAreaComingSoonComponent,
    ProjectAreasEmptyListComponent,
    ProjectAreaScenariosListComponent,
    OverlayLoaderComponent,
    ScenarioToolsComponent,
    ProjectAreasEmptyListComponent,
  ],
  templateUrl: './project-area-dashboard.component.html',
  styleUrl: './project-area-dashboard.component.scss',
})
export class ProjectAreaDashboardComponent implements OnInit {
  currentPlan$ = this.planState.currentPlan$;
  loadingPlan$ = this.planState.isPlanLoading$;
  loadingProjectArea$ = this.scenarioState.isScenarioLoading$;
  currentScenario$ = this.scenarioState.currentScenario$;
  planId = this.route.parent?.snapshot.data['planId'];

  dashboardTools: {
    id: string;
    backgroundImage: string;
    backgroundColor?: string;
    title: string;
    enabled: boolean;
  }[] = [];

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

  onToolClick(route: string): void {
    const planId = this.route.snapshot.data['planId'];
    if (planId) {
      this.breadcrumbService.updateBreadCrumb({
        label: 'Project Area Dashboard',
        backUrl: `../projdashboard`,
      });
      this.router.navigate([route], { relativeTo: this.route });
    }
  }
}
