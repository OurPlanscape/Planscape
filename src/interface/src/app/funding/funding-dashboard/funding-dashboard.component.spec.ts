import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, NEVER, of, Subject } from 'rxjs';
import { FundingDashboardComponent } from '@app/funding/funding-dashboard/funding-dashboard.component';
import { MockProvider } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { ToolInfoCardComponent } from '@styleguide/tool-info-card/tool-info-card.component';
import { ProductAnalyticsService } from '@services/product-analytics.service';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ScenarioState } from '@scenario/scenario.state';
import { PlanState } from '@plan/plan.state';
import { AuthService } from '@services/auth.service';
import {
  Capabilities,
  FUNDING_REPORT_EVENTS,
  FundingReport,
  Plan,
  Resource,
  Scenario,
  User,
  WorkspaceEvent,
} from '@types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FundingReportService } from '@app/services/funding-report.service';
import { WebSocketService } from '@services';
import { FEATURES_JSON } from '@app/features/features-config';

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
  let updates$: Subject<WorkspaceEvent | null>;
  let scenarioUpdates$: jasmine.Spy;

  /** One event on the channel of this scenario. */
  function somethingChanged() {
    updates$.next({ type: 'funding_report.report.status_changed' });
  }

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
    updates$ = new Subject<WorkspaceEvent | null>();
    scenarioUpdates$ = jasmine
      .createSpy('scenarioUpdates$')
      .and.returnValue(updates$);
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
        MockProvider(ProductAnalyticsService),
        MockProvider(WebSocketService, { scenarioUpdates$ }),
        { provide: FEATURES_JSON, useValue: {} },
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

  /** Resolves the first report GET as "not generated". */
  async function resolveNoReport() {
    const httpMock = TestBed.inject(HttpTestingController);
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

    component.generateReport('empty_state');

    httpMock
      .expectOne((req) => req.url.endsWith('v2/scenarios/123/run-report/'))
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(snackSpy).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../dashboard'], {
      relativeTo: activatedRoute,
    });
  });

  it('listens on the channel of this scenario, for what changes the report', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));

    expect(scenarioUpdates$).toHaveBeenCalledWith(123, FUNDING_REPORT_EVENTS);
  });

  it('reads the report once and again on every event', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);
    const reportSpy = spyOn(fundingReportService, 'getReport').and.returnValue(
      of({
        status: 'RUNNING',
        geopackage_status: 'PROCESSING',
      } as FundingReport)
    );

    component.reload$.next();
    expect(reportSpy).toHaveBeenCalledTimes(1);

    somethingChanged();
    expect(reportSpy).toHaveBeenCalledTimes(2);

    somethingChanged();
    expect(reportSpy).toHaveBeenCalledTimes(3);
  });

  it('keeps listening once the report is done, for the geopackage', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);
    const reportSpy = spyOn(fundingReportService, 'getReport').and.returnValue(
      of({
        status: 'SUCCESS',
        geopackage_status: 'PROCESSING',
        results: {},
      } as FundingReport)
    );

    component.reload$.next();
    somethingChanged();

    expect(reportSpy).toHaveBeenCalledTimes(2);
  });

  it('should show the no-results state when the report status is EMPTY', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);
    const report = {
      status: 'EMPTY',
      results: null,
      geopackage_status: null,
    } as FundingReport;
    spyOn(fundingReportService, 'getReport').and.returnValue(of(report));

    component.reload$.next();

    let hasNoResults: boolean | undefined;
    let hasOutput: boolean | undefined;
    component.hasNoResults$.subscribe((v) => (hasNoResults = v));
    component.hasOutput$.subscribe((v) => (hasOutput = v));

    expect(hasNoResults).toBe(true);
    expect(hasOutput).toBe(false);
  });

  it('should show the generating spinner instantly on click, before the server responds', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    fundingReportService = TestBed.inject(FundingReportService);
    // No report exists yet: the read resolves to null.
    spyOn(fundingReportService, 'getReport').and.returnValue(of(null));
    // Never resolves during this test, so isGenerating$ can only be driven by
    // the pending click, not by a read landing a PENDING report.
    spyOn(fundingReportService, 'generateReport').and.returnValue(NEVER);

    component.reload$.next();

    let isGenerating: boolean | undefined;
    component.isGenerating$.subscribe((v) => (isGenerating = v));
    expect(isGenerating).toBe(false);

    component.generateReport('empty_state');
    expect(isGenerating).toBe(true);
  });

  it('tracks which entry point asked for the report', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    const analytics = TestBed.inject(ProductAnalyticsService);
    spyOn(analytics, 'trackEvent');

    component.generateReport('retry');

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      'funding_report.generation.requested',
      { source: 'retry' }
    );
  });

  it('tracks partner logo clicks', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']));
    const analytics = TestBed.inject(ProductAnalyticsService);
    spyOn(analytics, 'trackEvent');

    component.trackPartnerClick({
      name: 'Partner',
      url: 'https://partner.example',
      logo: 'logo.png',
    });

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      'funding_report.partner_link.clicked',
      { name: 'Partner', url: 'https://partner.example' }
    );
  });

  it('tracks from the empty state button, wiring included', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']), '123', makePlan(7), {
      id: 7,
    } as User);
    await resolveNoReport();
    const analytics = TestBed.inject(ProductAnalyticsService);
    spyOn(analytics, 'trackEvent');

    // Click the real button rather than calling the handler, so a broken
    // template binding fails here instead of going silently untracked.
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'app-funding-empty-state button'
    );
    button.click();

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      'funding_report.generation.requested',
      { source: 'empty_state' }
    );

    const httpMock = TestBed.inject(HttpTestingController);
    httpMock
      .expectOne((req) => req.url.endsWith('v2/scenarios/123/run-report/'))
      .flush(null);
  });

  it('tracks partner clicks emitted by the info card, wiring included', async () => {
    await setup(makeScenario(123, ['FUNDING_REPORT']), '123', makePlan(7), {
      id: 7,
    } as User);
    await resolveNoReport();
    const analytics = TestBed.inject(ProductAnalyticsService);
    spyOn(analytics, 'trackEvent');

    const card = fixture.debugElement.query(
      By.directive(ToolInfoCardComponent)
    );
    const partner = component.partners[0];
    card.componentInstance.clickPartner.emit(partner);

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      'funding_report.partner_link.clicked',
      { name: partner.name, url: partner.url }
    );
  });
});
