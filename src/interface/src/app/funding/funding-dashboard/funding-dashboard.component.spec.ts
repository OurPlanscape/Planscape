import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FundingDashboardComponent } from '@app/funding/funding-dashboard/funding-dashboard.component';
import { MockProvider } from 'ng-mocks';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ScenarioState } from '@scenario/scenario.state';
import { Capabilities, Scenario } from '@types';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('FundingDashboardComponent', () => {
  let component: FundingDashboardComponent;
  let fixture: ComponentFixture<FundingDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let currentScenario$: BehaviorSubject<Scenario>;
  let currentScenarioId$: BehaviorSubject<number | null>;
  let activatedRoute: ActivatedRoute;

  function makeScenario(id: number, capabilities: Capabilities[]): Scenario {
    return {
      id,
      name: 'scenario',
      planning_area: 1,
      status: 'ACTIVE',
      type: 'PRESET',
      user: 1,
      geopackage_status: 'PENDING',
      geopackage_url: null,
      configuration: {},
      capabilities,
    };
  }

  async function setup(scenario: Scenario, routeScenarioId = '123') {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    currentScenario$ = new BehaviorSubject<Scenario>(scenario);
    currentScenarioId$ = new BehaviorSubject<number | null>(scenario.id);
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
          useValue: { currentScenario$, currentScenarioId$ },
        },
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
});
