import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { FundingDashboardComponent } from '@app/funding/funding-dashboard/funding-dashboard.component';
import { MockProvider } from 'ng-mocks';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ScenarioState } from '@scenario/scenario.state';
import { PlanState } from '@plan/plan.state';
import { AuthService } from '@services/auth.service';
import {
  Capabilities,
  FundingReport,
  Plan,
  Resource,
  Scenario,
  User,
} from '@types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FundingReportService } from '@app/services/funding-report.service';
import { POLLING_INTERVAL } from '@app/plan/plan-helpers';

describe('FundingDashboardComponent', () => {
  let component: FundingDashboardComponent;
  let fixture: ComponentFixture<FundingDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let currentScenario$: BehaviorSubject<Scenario>;
  let currentScenarioId$: BehaviorSubject<number | null>;
  let currentScenarioResource$: BehaviorSubject<Resource<Scenario>>;
  let currentPlan$: BehaviorSubject<Plan>;
  let loggedInUser$: BehaviorSubject<User | null | undefined>;
  let activatedRoute: ActivatedRoute;
  let fundingReportService: FundingReportService;

  function makeScenario(
    id: number,
    capabilities: Capabilities[],
    user = 1
  ): Scenario {
    return {
      id,
      name: 'scenario',
      planning_area: 1,
      status: 'ACTIVE',
      type: 'PRESET',
      user,
      geopackage_status: 'PENDING',
      geopackage_url: null,
      configuration: {},
      capabilities,
    };
  }

  /** Owner by default (plan.user === user.id); pass permissions/owner to vary. */
  function makePlan(user: number, permissions: string[] = []): Plan {
    return { id: 1, user, permissions } as Plan;
  }

  async function setup(
    scenario: Scenario,
    routeScenarioId = '123',
    plan: Plan = makePlan(7),
    user: User = { id: 7 } as User
  ) {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    currentScenario$ = new BehaviorSubject<Scenario>(scenario);
    currentScenarioId$ = new BehaviorSubject<number | null>(scenario.id);
    currentScenarioResource$ = new BehaviorSubject<Resource<Scenario>>({
      isLoading: false,
      data: scenario,
    });
    currentPlan$ = new BehaviorSubject<Plan>(plan);
    loggedInUser$ = new BehaviorSubject<User | null | undefined>(user);
    activatedRoute = {
      snapshot: {
        paramMap: convertToParamMap({ scenarioId: routeScenarioId }),
      },
    } as unknown as ActivatedRoute;

    await TestBed.configureTestingModule({
      imports: [
        FundingDashboardComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
      ],
      providers: [
        MockProvider(BreadcrumbService),
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: activatedRoute },
        {
          provide: ScenarioState,
          useValue: {
            currentScenario$,
            currentScenarioId$,
            currentScenarioResource$,
          },
        },
        { provide: PlanState, useValue: { currentPlan$ } },
        { provide: AuthService, useValue: { loggedInUser$ } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    expect(component).toBeTruthy();
  });

  it('stays on the page when the scenario supports the funding report', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('redirects to the dashboard when the scenario lacks the capability', async () => {
    await setup(makeScenario(123, ['IMPACTS']));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../dashboard'], {
      relativeTo: activatedRoute,
    });
  });

  it('ignores a stale cached scenario and acts on the route one', async () => {
    // A different scenario is cached when the component initializes.
    await setup(makeScenario(999, ['FUNDING_REPORT']), '123');
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // The route's scenario (no capability) finishes loading.
    currentScenario$.next(makeScenario(123, ['IMPACTS']));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../dashboard'], {
      relativeTo: activatedRoute,
    });
  });

  it('redirects home when the scenario query fails (e.g. no permission)', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    mockRouter.navigate.calls.reset();

    currentScenarioResource$.next({
      isLoading: false,
      error: new Error('Forbidden'),
    });

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('treats the plan owner as able to edit (can generate the report)', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']), '123', makePlan(7), {
      id: 7,
    } as User);
    let canEdit: boolean | undefined;
    (component as any).canEdit$.subscribe((v: boolean) => (canEdit = v));
    expect(canEdit).toBeTrue();
  });

  it('treats a collaborator (add_scenario permission) as able to edit', async () => {
    await setup(
      makeScenario(123, ['FUNDING_REPORT']),
      '123',
      makePlan(999, ['view_planningarea', 'view_scenario', 'add_scenario']),
      { id: 7 } as User
    );
    let canEdit: boolean | undefined;
    (component as any).canEdit$.subscribe((v: boolean) => (canEdit = v));
    expect(canEdit).toBeTrue();
  });

  it('treats a viewer (view permissions only) as unable to edit', async () => {
    await setup(
      makeScenario(123, ['FUNDING_REPORT']),
      '123',
      makePlan(999, ['view_planningarea', 'view_scenario']),
      { id: 7 } as User
    );
    let canEdit: boolean | undefined;
    (component as any).canEdit$.subscribe((v: boolean) => (canEdit = v));
    expect(canEdit).toBeFalse();
  });

  /** Lets the poll timer fire, then resolves the report GET as "not generated". */
  async function resolveNoReport() {
    const httpMock = TestBed.inject(HttpTestingController);
    await new Promise((r) => setTimeout(r, 0));
    httpMock
      .expectOne((req) => req.url.endsWith('v2/scenarios/123/get-report/'))
      .flush(null);
    fixture.detectChanges();
  }

  it('shows the no-access state for a viewer when no report has been generated', async () => {
    await setup(
      makeScenario(123, ['FUNDING_REPORT']),
      '123',
      makePlan(999, []),
      { id: 7 } as User
    );
    await resolveNoReport();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.no-access')).toBeTruthy();
    expect(el.querySelector('.no-access-title')?.textContent).toContain(
      'Awaiting Funding Opportunity Report'
    );
    expect(el.querySelector('app-funding-empty-state')).toBeNull();
  });

  it('shows the generate empty state for an owner when no report has been generated', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']), '123', makePlan(7), {
      id: 7,
    } as User);
    await resolveNoReport();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-funding-empty-state')).toBeTruthy();
    expect(el.querySelector('.no-access')).toBeNull();
  });

  it('shows the generate empty state for a collaborator when no report has been generated', async () => {
    await setup(
      makeScenario(123, ['FUNDING_REPORT']),
      '123',
      makePlan(999, ['view_planningarea', 'view_scenario', 'add_scenario']),
      { id: 7 } as User
    );
    await resolveNoReport();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-funding-empty-state')).toBeTruthy();
    expect(el.querySelector('.no-access')).toBeNull();
  });

  it('shows a snackbar and redirects when starting the report fails', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    const httpMock = TestBed.inject(HttpTestingController);
    // The component resolves MatSnackBar from its own element injector.
    const snackbar = fixture.debugElement.injector.get(MatSnackBar);
    const snackSpy = spyOn(snackbar, 'open');
    mockRouter.navigate.calls.reset();

    component.generateReport();

    httpMock
      .expectOne((req) => req.url.endsWith('v2/scenarios/123/run-report/'))
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(snackSpy).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../dashboard'], {
      relativeTo: activatedRoute,
    });
  });

  it('should continue polling while report is RUNNING even if geopackage is SUCCEEDED', fakeAsync(async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);

    const report1 = {
      status: 'RUNNING',
      geopackage_status: 'SUCCEEDED',
    } as FundingReport;
    const report2 = {
      status: 'SUCCESS',
      geopackage_status: 'SUCCEEDED',
      results: {},
    } as FundingReport;

    const reportSpy = spyOn(fundingReportService, 'getReport').and.returnValues(
      of(report1),
      of(report2)
    );

    component.reload$.next();
    tick(0); // First immediate poll (timer delay 0)

    expect(reportSpy).toHaveBeenCalledTimes(1);

    tick(POLLING_INTERVAL);
    expect(reportSpy).toHaveBeenCalledTimes(2);

    // it should have stopped because report2 is a terminal state
    tick(POLLING_INTERVAL);
    expect(reportSpy).toHaveBeenCalledTimes(2);
  }));

  it('should continue polling while geopackage is PROCESSING even if report is SUCCESS', fakeAsync(async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);

    const report1 = {
      status: 'SUCCESS',
      geopackage_status: 'PROCESSING',
    } as FundingReport;
    const report2 = {
      status: 'SUCCESS',
      geopackage_status: 'SUCCEEDED',
      results: {},
    } as FundingReport;

    const reportSpy = spyOn(fundingReportService, 'getReport').and.returnValues(
      of(report1),
      of(report2)
    );

    component.reload$.next();
    tick(0); // Call 1
    expect(reportSpy).toHaveBeenCalledTimes(1);

    tick(POLLING_INTERVAL); // Call 2
    expect(reportSpy).toHaveBeenCalledTimes(2);

    tick(POLLING_INTERVAL); // Stream should be complete, no Call 3
    expect(reportSpy).toHaveBeenCalledTimes(2);
  }));

  it('should stop polling immediately if the report status fails', fakeAsync(async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);
    const report1 = {
      status: 'FAILED',
      geopackage_status: 'PENDING',
    } as FundingReport;
    const reportSpy = spyOn(fundingReportService, 'getReport').and.returnValue(
      of(report1)
    );

    component.reload$.next();
    tick(0);
    expect(reportSpy).toHaveBeenCalledTimes(1);

    // Even though geopackage was PENDING, report FAILED is an immediate dealbreaker
    tick(POLLING_INTERVAL);
    expect(reportSpy).toHaveBeenCalledTimes(1);
  }));

  it('should show the no-results state when the report status is EMPTY', fakeAsync(async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);
    const report = {
      status: 'EMPTY',
      results: null,
      geopackage_status: null,
    } as FundingReport;
    spyOn(fundingReportService, 'getReport').and.returnValue(of(report));

    component.reload$.next();
    tick(0);

    let hasNoResults: boolean | undefined;
    let hasOutput: boolean | undefined;
    component.hasNoResults$.subscribe((v) => (hasNoResults = v));
    component.hasOutput$.subscribe((v) => (hasOutput = v));

    expect(hasNoResults).toBe(true);
    expect(hasOutput).toBe(false);
  }));

  it('should show the generating spinner instantly on click, before the server responds', fakeAsync(async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);
    // No report exists yet: the poll resolves to null.
    spyOn(fundingReportService, 'getReport').and.returnValue(of(null));
    // Never resolves during this test, so isGenerating$ can only be driven by
    // the pending click, not by a poll landing a PENDING report.
    spyOn(fundingReportService, 'generateReport').and.returnValue(NEVER);

    component.reload$.next();
    tick(0);

    let isGenerating: boolean | undefined;
    component.isGenerating$.subscribe((v) => (isGenerating = v));
    expect(isGenerating).toBe(false);

    component.generateReport();
    expect(isGenerating).toBe(true);
  }));
});
