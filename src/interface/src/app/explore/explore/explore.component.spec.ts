import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PlanState } from '@app/plan/plan.state';
import { ScenarioState } from '@app/scenario/scenario.state';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { Plan, Scenario } from '@app/types';
import { ExploreSidebarComponent } from '@explore/explore-sidebar/explore-sidebar.component';
import { LegacySidebarComponent } from '@explore/legacy-sidebar/legacy-sidebar.component';
import { overrideFeatureFlags } from '@features/testing';
import { SyncedMapsComponent } from '@maplibre-map/synced-maps/synced-maps.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ExploreStorageService } from '@services/local-storage.service';
import { SharedModule } from '@shared';
import { Geometry } from '@turf/helpers';
import {
  MockComponents,
  MockDeclarations,
  MockProvider,
  MockProviders,
} from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { ExploreComponent } from './explore.component';

describe('ExploreComponent', () => {
  let fixture: ComponentFixture<ExploreComponent>;
  let breadcrumbService: BreadcrumbService;
  let currentPlanId$: BehaviorSubject<number | null>;

  const mockRouteSnapshotData: { planId?: number; scenarioId?: number } = {};

  const mockPlan: Plan = {
    id: 999,
    name: 'Test Plan',
    geometry: { type: 'Point', coordinates: [0, 0] } as Geometry,
  } as Plan;

  const mockScenario: Scenario = {
    id: 1234,
    name: 'Test Scenario',
    configuration: {},
    planning_area: 1,
    status: 'ACTIVE',
    user: 1,
    geopackage_status: 'PENDING',
    geopackage_url: null,
    type: 'PROJECT_AREAS',
  };

  function setupComponent() {
    breadcrumbService = TestBed.inject(BreadcrumbService);
    fixture = TestBed.createComponent(ExploreComponent);
    spyOn(breadcrumbService, 'updateBreadCrumb');
    fixture.detectChanges();
  }

  function lastBreadcrumbConfig() {
    return (
      breadcrumbService.updateBreadCrumb as jasmine.Spy
    ).calls.mostRecent().args[0];
  }

  beforeEach(async () => {
    mockRouteSnapshotData.planId = 24;
    mockRouteSnapshotData.scenarioId = 1234;
    currentPlanId$ = new BehaviorSubject<number | null>(24);

    await TestBed.configureTestingModule({
      imports: [ExploreComponent, SharedModule, BrowserAnimationsModule],
      providers: [
        MockProviders(BreadcrumbService, ExploreStorageService),
        MockProvider(PlanState, {
          currentPlanId$,
          currentPlan$: of(mockPlan),
        }),
        MockProvider(ScenarioState, {
          currentScenario$: of(mockScenario),
        }),
        MockProvider(ActivatedRoute, {
          snapshot: { data: mockRouteSnapshotData } as any,
        }),
      ],
      declarations: [MockDeclarations(SyncedMapsComponent, NavBarComponent)],
    })
      .overrideComponent(ExploreComponent, {
        remove: { imports: [ExploreSidebarComponent, LegacySidebarComponent] },
        add: {
          imports: MockComponents(
            ExploreSidebarComponent,
            LegacySidebarComponent
          ),
        },
      })
      .compileComponents();
  });

  it('renders the legacy sidebar when DATA_ORGANIZATION is off', () => {
    overrideFeatureFlags();
    setupComponent();

    expect(
      fixture.debugElement.query(By.css('app-legacy-sidebar'))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-explore-sidebar'))
    ).toBeNull();
  });

  it('renders the icon rail sidebar when DATA_ORGANIZATION is on', () => {
    overrideFeatureFlags('DATA_ORGANIZATION');
    setupComponent();

    expect(
      fixture.debugElement.query(By.css('app-explore-sidebar'))
    ).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-legacy-sidebar'))).toBeNull();
  });

  it('should use scenario breadcrumb label and backUrl when scenarioId, plan and scenario exist', () => {
    setupComponent();

    const config = lastBreadcrumbConfig();
    expect(config.label).toEqual('Map Viewer: Test Scenario');
    expect(config.backUrl).toContain('/scenario/1234/dashboard');
  });

  it('should set a breadcrumb to Plan when no scenarioId is present', () => {
    delete mockRouteSnapshotData.scenarioId;
    setupComponent();

    const config = lastBreadcrumbConfig();
    expect(config.label).toEqual('Map Viewer: Test Plan');
    expect(config.backUrl).not.toContain('/scenario/');
  });

  it('should set a "New Plan" breadcrumb with no plan', () => {
    delete mockRouteSnapshotData.planId;
    delete mockRouteSnapshotData.scenarioId;
    currentPlanId$.next(null);
    setupComponent();

    const config = lastBreadcrumbConfig();
    expect(config.label).toEqual('New Plan');
    expect(config.backUrl).toEqual('/');
  });

  it('points "New Plan" back to the workspace in the workspace map viewer', () => {
    delete mockRouteSnapshotData.planId;
    delete mockRouteSnapshotData.scenarioId;
    currentPlanId$.next(null);
    (TestBed.inject(ActivatedRoute).snapshot as any).pathFromRoot = [
      { paramMap: convertToParamMap({ workspaceId: '7' }) },
    ];
    setupComponent();

    expect(lastBreadcrumbConfig().backUrl).toEqual('/workspace/7');
  });
});
