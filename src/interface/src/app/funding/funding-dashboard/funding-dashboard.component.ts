import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { NavBarComponent } from '@standalone/nav-bar/nav-bar.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { BehaviorSubject, filter, map, take } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FundingEmptyStateComponent } from '../funding-empty-state/funding-empty-state.component';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { FundingReportComponent } from '@app/funding/funding-report/funding-report.component';
import { ToolInfoCardComponent } from '@styleguide';
import { ScenarioState } from '@scenario/scenario.state';
import { scenarioHasCapability } from '@scenario/scenario-helper';

// placeholder type
interface Report {
  status: 'success' | 'generating' | 'error';
}

@UntilDestroy()
@Component({
  selector: 'app-funding-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutComponent,
    NavBarComponent,
    FundingEmptyStateComponent,
    LegacyMaterialModule,
    FundingReportComponent,
    ToolInfoCardComponent,
  ],
  templateUrl: './funding-dashboard.component.html',
  styleUrl: './funding-dashboard.component.scss',
})
export class FundingDashboardComponent implements OnInit {
  constructor(
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  // report stubbed out for now
  report$ = new BehaviorSubject<Report | null>(null);

  isGenerating$ = this.report$.pipe(map((r) => r?.status === 'generating'));
  hasOutput$ = this.report$.pipe(map((r) => r?.status === 'success'));

  readonly partners = [
    {
      name: 'Blue Forest',
      logo: '/assets/png/blue-forest.png',
      url: 'https://www.blueforest.org/',
    },
    {
      name: 'The Freshwater Trust',
      logo: '/assets/png/freshwater-trust.png',
      url: 'https://thefreshwatertrust.org/',
    },
  ];

  ngOnInit() {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Scenario Dashboard ',
      backUrl: '../dashboard',
    });
    this.redirectIfFundingReportUnavailable();
  }

  private redirectIfFundingReportUnavailable() {
    const scenarioId = Number(this.route.snapshot.paramMap.get('scenarioId'));
    this.scenarioState.currentScenario$
      .pipe(
        filter((scenario) => scenario.id === scenarioId),
        take(1),
        untilDestroyed(this)
      )
      .subscribe((scenario) => {
        if (!scenarioHasCapability(scenario, 'FUNDING_REPORT')) {
          this.router.navigate(['../dashboard'], { relativeTo: this.route });
        }
      });
  }

  generateReport() {
    this.report$.next({ status: 'generating' });
    // simulate generating report
    setTimeout(() => {
      this.report$.next({ status: 'success' });
    }, 1000);
  }
}
