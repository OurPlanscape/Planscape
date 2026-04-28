import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { ScenarioState } from '../scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { OverlayLoaderComponent, TileButtonComponent } from '@styleguide';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { getPlanPath } from '@app/plan/plan-helpers';
import { ActivatedRoute } from '@angular/router';

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
  ],
  templateUrl: './scenario-dashboard.component.html',
  styleUrl: './scenario-dashboard.component.scss',
})
export class ScenarioDashboardComponent implements OnInit {
  currentScenario$ = this.scenarioState.currentScenario$;
  currentPlan$ = this.planState.currentPlan$;
  loadingPlan$ = this.planState.isPlanLoading$;
  loadingScenario$ = this.scenarioState.isScenarioLoading$;
  planId = this.route.parent?.snapshot.data['planId'];

  scenarioDashboardTools = [
    {
      backgroundImage: '/assets/svg/treatment-effects.svg',
      backgroundColor: '#dfede6',
      title: 'Treatment Effects',
      subtitle: 'The Treatment Effects module aims t...',
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
