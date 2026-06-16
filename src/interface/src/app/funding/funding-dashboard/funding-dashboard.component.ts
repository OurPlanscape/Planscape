import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { NavBarComponent } from '@standalone/nav-bar/nav-bar.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import {
  BehaviorSubject,
  combineLatest,
  exhaustMap,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeWhile,
  timer,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FundingEmptyStateComponent } from '../funding-empty-state/funding-empty-state.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FundingReportComponent } from '@app/funding/funding-report/funding-report.component';
import { ButtonComponent, ToolInfoCardComponent } from '@styleguide';
import { ScenarioState } from '@scenario/scenario.state';
import { scenarioHasCapability } from '@scenario/scenario-helper';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReport } from '@types';
import { POLLING_INTERVAL } from '@plan/plan-helpers';
import { SNACK_ERROR_CONFIG, SUPPORT_URL } from '@shared';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';

@UntilDestroy()
@Component({
  selector: 'app-funding-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutComponent,
    NavBarComponent,
    FundingEmptyStateComponent,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FundingReportComponent,
    ToolInfoCardComponent,
    MessageCardComponent,
    ButtonComponent,
  ],
  templateUrl: './funding-dashboard.component.html',
  styleUrl: './funding-dashboard.component.scss',
})
export class FundingDashboardComponent implements OnInit {
  constructor(
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private router: Router,
    private route: ActivatedRoute,
    private fundingReportService: FundingReportService,
    private snackbar: MatSnackBar
  ) {}

  protected readonly SUPPORT_URL = SUPPORT_URL;

  private scenarioId$ = this.scenarioState.currentScenarioId$.pipe(
    filter((id): id is number => id !== null),
    take(1)
  );

  /** Fires on init and after `generateReport()` to (re)start polling. */
  private reload$ = new BehaviorSubject<void>(undefined);

  /** Set the moment the user clicks generate, so the view switches instantly. */
  private generationRequested$ = new BehaviorSubject<boolean>(false);

  report$ = this.scenarioId$.pipe(
    switchMap((id) => this.reload$.pipe(switchMap(() => this.pollReport(id)))),
    untilDestroyed(this),
    shareReplay(1)
  );

  /** True until the initial report request resolves. */
  loading$ = this.report$.pipe(
    map(() => false),
    startWith(true)
  );

  isGenerating$ = combineLatest([this.report$, this.generationRequested$]).pipe(
    map(([report, requested]) => {
      // A finished report always wins over a pending click.
      if (report?.status === 'SUCCESS' || report?.status === 'FAILED') {
        return false;
      }
      return requested || this.isGenerating(report);
    })
  );
  hasOutput$ = this.report$.pipe(
    map((r) => r?.status === 'SUCCESS' && this.hasResults(r))
  );
  /** Report finished successfully but produced no results (e.g. no treatable areas). */
  hasNoResults$ = this.report$.pipe(
    map((r) => r?.status === 'SUCCESS' && !this.hasResults(r))
  );
  hasError$ = this.report$.pipe(map((r) => r?.status === 'FAILED'));

  /** Empty state shows only before a report exists and before the user asks. */
  showEmptyState$ = combineLatest([
    this.report$,
    this.generationRequested$,
  ]).pipe(map(([report, requested]) => report === null && !requested));

  /**
   * Polls the report every `POLLING_INTERVAL` while it is still generating,
   * emitting the first terminal (or empty) report and then completing.
   */
  private pollReport(scenarioId: number) {
    return timer(0, POLLING_INTERVAL).pipe(
      exhaustMap(() => this.fundingReportService.getReport(scenarioId)),
      takeWhile((report) => this.isGenerating(report), true)
    );
  }

  private isGenerating(report: FundingReport | null): boolean {
    return report?.status === 'PENDING' || report?.status === 'RUNNING';
  }

  /** Whether a (successful) report actually carries results to display. */
  private hasResults(report: FundingReport | null): boolean {
    return !!report?.results;
  }

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

  generateReport() {
    // Switch to the generating state immediately, before the server responds.
    this.generationRequested$.next(true);
    this.scenarioState.currentScenario$
      .pipe(
        take(1),
        switchMap((scenario) =>
          this.fundingReportService.generateReport(scenario.id)
        ),
        untilDestroyed(this)
      )
      .subscribe({
        next: () => this.reload$.next(),
        error: () => {
          this.snackbar.open(
            'Could not start the funding report. Please try again later.',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
          this.redirectToDashboard();
        },
      });
  }

  private redirectToDashboard() {
    this.router.navigate(['../dashboard'], { relativeTo: this.route });
  }

  // redirect if the scenario does not have funding report capability
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
          this.redirectToDashboard();
        }
      });
  }
}
