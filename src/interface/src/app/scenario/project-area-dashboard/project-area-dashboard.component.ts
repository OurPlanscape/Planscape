import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { PlanState } from '@app/plan/plan.state';
import { OverlayLoaderComponent, TileButtonComponent } from '@styleguide';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { getPlanPath } from '@app/plan/plan-helpers';
import { ActivatedRoute } from '@angular/router';
import { MapViewerCardComponent } from '@app/plan/map-viewer-card/map-viewer-card.component';
import { ProjectAreaComingSoonComponent } from '../project-area-coming-soon/project-area-coming-soon.component';
import { ScenarioState } from '../scenario.state';

@UntilDestroy()
@Component({
  selector: 'app-project-area-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    DashboardLayoutComponent,
    MapViewerCardComponent,
    NavBarComponent,
    DetailsCardComponent,
    ProjectAreaComingSoonComponent,
    TileButtonComponent,
    OverlayLoaderComponent,
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

  dashboardTools = [
    {
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
      subtitle: '',
      featureFlag: '',
      enabled: false,
    },
  ];

  constructor(
    private scenarioState: ScenarioState,
    private planState: PlanState,
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Planning Area Overview',
      backUrl: getPlanPath(this.planId),
    });
  }
}
