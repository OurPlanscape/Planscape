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
import { ActivatedRoute, Router } from '@angular/router';
import { MapViewerCardComponent } from '@app/plan/map-viewer-card/map-viewer-card.component';
import { ProjectAreaComingSoonComponent } from '../project-area-coming-soon/project-area-coming-soon.component';
import { ScenarioState } from '../scenario.state';
import { FeatureService } from '@features/feature.service';

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
    private router: Router,
    private featureService: FeatureService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Planning Area Overview',
      backUrl: getPlanPath(this.planId),
    });

    this.dashboardTools = [
      {
        id: 'treatment-effects',
        backgroundImage: '/assets/svg/treatment-effects.svg',
        backgroundColor: '#dfede6',
        title: 'Treatment Effects',
        enabled: true,
      },
      this.featureService.isFeatureEnabled('FUNDING_REPORTS')
        ? {
            id: 'funding-opportunity-report',
            backgroundImage: '/assets/svg/funding.svg',
            backgroundColor: '#dfede6',
            title: 'Funding Opportunity Report',
            enabled: true,
          }
        : {
            id: 'coming-soon',
            backgroundImage: '/assets/svg/lock.svg',
            title: 'Coming Soon',
            enabled: false,
          },
    ];
  }

  onToolClick(toolId: string): void {
    if (toolId === 'treatment-effects') {
      const planId = this.route.snapshot.data['planId'];
      if (planId) {
        this.breadcrumbService.updateBreadCrumb({
          label: 'Project Area Dashboard',
          backUrl: `../projdashboard`,
        });
        this.router.navigate(['../treatment'], { relativeTo: this.route });
      }
    }
    if (toolId === 'funding-opportunity-report') {
      const planId = this.route.snapshot.data['planId'];
      if (planId) {
        this.breadcrumbService.updateBreadCrumb({
          label: 'Project Area Dashboard',
          backUrl: `../projdashboard`,
        });
        this.router.navigate(['../funding'], { relativeTo: this.route });
      }
    }
  }
}
