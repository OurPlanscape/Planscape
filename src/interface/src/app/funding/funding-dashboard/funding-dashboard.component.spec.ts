import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FundingDashboardComponent } from '@app/funding/funding-dashboard/funding-dashboard.component';
import { MockProvider } from 'ng-mocks';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ScenarioState } from '@scenario/scenario.state';
import { Capabilities, Scenario } from '@types';

describe('FundingDashboardComponent', () => {
  let component: FundingDashboardComponent;
  let fixture: ComponentFixture<FundingDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let currentScenario$: BehaviorSubject<Scenario>;
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
        { provide: ScenarioState, useValue: { currentScenario$ } },
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
});
