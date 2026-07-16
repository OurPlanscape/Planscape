import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { NavBarComponent } from '@standalone/nav-bar/nav-bar.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  exhaustMap,
  filter,
  map,
  of,
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
import { AuthService } from '@services/auth.service';
import { FundingReport, User } from '@types';
import { PlanState } from '@plan/plan.state';
import { canAddScenario } from '@plan/permissions';
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
    private planState: PlanState,
    private authService: AuthService,
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
  reload$ = new BehaviorSubject<void>(undefined);

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
      if (!this.isStillProcessing(report)) {
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
  hasEmptyResults$ = this.report$.pipe(map((r) => r?.status === 'EMPTY'));

  /** Report hasn't been generated yet (and the user hasn't just asked for it). */
  private reportNotGenerated$ = combineLatest([
    this.report$,
    this.generationRequested$,
  ]).pipe(map(([report, requested]) => report === null && !requested));

  /**
   * Whether the current user can generate the report. Collaborators and Owners
   * can (`add_scenario`); only Viewers get the no-access message instead.
   */
  private canEdit$ = combineLatest([
    this.planState.currentPlan$,
    this.authService.loggedInUser$.pipe(filter((u): u is User => !!u)),
  ]).pipe(
    map(([plan, user]) => plan.user === user.id || !!canAddScenario(plan)),
    catchError(() => of(false)),
    shareReplay(1)
  );

  /** Show the "generate report" empty state: no report yet and the user can edit. */
  showEmptyState$ = combineLatest([
    this.reportNotGenerated$,
    this.canEdit$,
  ]).pipe(map(([notGenerated, canEdit]) => notGenerated && canEdit));

  /** Show the no-access message: no report yet and the user cannot edit. */
  showNoAccess$ = combineLatest([this.reportNotGenerated$, this.canEdit$]).pipe(
    map(([notGenerated, canEdit]) => notGenerated && !canEdit)
  );

  /**
   * Polls the report every `POLLING_INTERVAL` while it is still generating,
   * emitting the first terminal (or empty) report and then completing.
   */
  private pollReport(scenarioId: number) {
    return timer(0, POLLING_INTERVAL).pipe(
      exhaustMap(() => this.fundingReportService.getReport(scenarioId)),
      takeWhile((report) => {
        const processingResult = this.isStillProcessing(report);
        return processingResult;
      }, true)
    );
  }

  private isGenerating(report: FundingReport | null): boolean {
    return report?.status === 'PENDING' || report?.status === 'RUNNING';
  }

  private isStillProcessing(report: FundingReport | null): boolean {
    if (!report) return false;
    if (report.status === 'FAILED') return false;

    const reportIsGenerating =
      report.status === 'PENDING' || report.status === 'RUNNING';

    const geoPackagePending =
      report.geopackage_status === 'PENDING' ||
      report.geopackage_status === 'PROCESSING';

    return reportIsGenerating || geoPackagePending;
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
    this.redirectIfScenarioUnavailable();
    this.redirectIfFundingReportUnavailable();
  }

  /**
   * Kick the user out to home if the scenario query fails — e.g. they don't
   * have permission to view it (the view permission lives on the planning area).
   */
  private redirectIfScenarioUnavailable() {
    this.scenarioState.currentScenarioResource$
      .pipe(
        filter((resource) => !!resource.error),
        take(1),
        untilDestroyed(this)
      )
      .subscribe(() => this.router.navigate(['/home']));
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
