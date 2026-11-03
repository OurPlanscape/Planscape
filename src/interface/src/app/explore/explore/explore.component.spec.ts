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
import { MapModuleService } from '@services/map-module.service';
import { SharedModule } from '@shared';
import { Geometry } from '@turf/helpers';
import {
  MockComponents,
  MockDeclarations,
  MockProvider,
  MockProviders,
} from 'ng-mocks';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { SidebarTabs } from '@explore/sidebar-tabs';
import { WorkspaceState } from '@app/workspaces/workspace.state';
import { ExploreComponent } from './explore.component';

describe('ExploreComponent', () => {
  let fixture: ComponentFixture<ExploreComponent>;
  let breadcrumbService: BreadcrumbService;
  let currentPlanId$: BehaviorSubject<number | null>;
  let currentPlanOrNull$: BehaviorSubject<Plan | null>;
  let currentPlanWorkspaceId$: Subject<number | null>;
  let loadMapModule: jasmine.Spy;
  let setWorkspaceId: jasmine.Spy;
  let resetWorkspaceId: jasmine.Spy;

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
    currentPlanOrNull$ = new BehaviorSubject<Plan | null>(mockPlan);
    currentPlanWorkspaceId$ = new Subject<number | null>();
    loadMapModule = jasmine.createSpy('loadMapModule').and.returnValue(of({}));
    setWorkspaceId = jasmine.createSpy('setWorkspaceId');
    resetWorkspaceId = jasmine.createSpy('resetWorkspaceId');

    await TestBed.configureTestingModule({
      imports: [ExploreComponent, SharedModule, BrowserAnimationsModule],
      providers: [
        MockProviders(BreadcrumbService, ExploreStorageService),
        MockProvider(PlanState, {
          currentPlanId$,
          currentPlanWorkspaceId$,
          currentPlan$: of(mockPlan),
          currentPlanOrNull$,
        }),
        MockProvider(MapModuleService, { loadMapModule }),
        MockProvider(WorkspaceState, { setWorkspaceId, resetWorkspaceId }),
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

  describe('map module', () => {
    beforeEach(() => overrideFeatureFlags('DATA_ORGANIZATION'));

    it("loads it narrowed to the plan's geometry", () => {
      setupComponent();
      expect(loadMapModule).toHaveBeenCalledOnceWith(mockPlan.geometry);
    });

    it('loads it unfiltered when DATA_ORGANIZATION is off', () => {
      overrideFeatureFlags();
      setupComponent();
      expect(loadMapModule).toHaveBeenCalledOnceWith(undefined);
    });

    it('loads it unfiltered without a plan', () => {
      currentPlanOrNull$.next(null);
      setupComponent();
      expect(loadMapModule).toHaveBeenCalledOnceWith(undefined);
    });

    it('does not reload when the same plan emits again', () => {
      setupComponent();
      currentPlanOrNull$.next({ ...mockPlan });
      expect(loadMapModule).toHaveBeenCalledTimes(1);
    });
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

  describe('the favorites of a planning area', () => {
    // they are the favorites of the workspace the area belongs to
    it('come from the workspace of the plan', () => {
      setupComponent();

      currentPlanWorkspaceId$.next(42);

      expect(setWorkspaceId).toHaveBeenCalledOnceWith(42);
      expect(resetWorkspaceId).not.toHaveBeenCalled();
    });

    it('are none for a planning area outside a workspace', () => {
      setupComponent();

      currentPlanWorkspaceId$.next(null);

      expect(resetWorkspaceId).toHaveBeenCalled();
      expect(setWorkspaceId).not.toHaveBeenCalled();
    });

    // the workspace map viewer gets its id from the route
    it('leave the workspace alone where there is no plan', () => {
      setupComponent();

      expect(setWorkspaceId).not.toHaveBeenCalled();
      expect(resetWorkspaceId).not.toHaveBeenCalled();
    });
  });

  describe('the side panel', () => {
    function mapState() {
      return fixture.debugElement.injector.get(MultiMapConfigState);
    }

    beforeEach(() => overrideFeatureFlags('DATA_ORGANIZATION'));

    it('stays on the favorites panel picked from the data layers one', () => {
      setupComponent();

      fixture.componentInstance.onTabIndexChange(SidebarTabs.FAVORITES);

      expect(fixture.componentInstance.tabIndex).toBe(SidebarTabs.FAVORITES);
    });

    it('stays on the favorites panel picked from the base layers one', () => {
      setupComponent();
      fixture.componentInstance.onTabIndexChange(SidebarTabs.BASE_LAYERS);

      fixture.componentInstance.onTabIndexChange(SidebarTabs.FAVORITES);

      expect(fixture.componentInstance.tabIndex).toBe(SidebarTabs.FAVORITES);
    });

    it('stays on the favorites panel with no map picked yet', () => {
      setupComponent();
      // a session that ended on the base layers comes back without one
      mapState().setSelectedMap(null);

      fixture.componentInstance.onTabIndexChange(SidebarTabs.FAVORITES);

      expect(fixture.componentInstance.tabIndex).toBe(SidebarTabs.FAVORITES);
    });

    it('keeps the favorites panel when its tabs pick another map', () => {
      setupComponent();
      fixture.componentInstance.onTabIndexChange(SidebarTabs.FAVORITES);

      // the tabs under the search bar show that map's favorites
      mapState().setSelectedMap(2);

      expect(fixture.componentInstance.tabIndex).toBe(SidebarTabs.FAVORITES);
    });

    it('opens the panel of the map the user clicks on, where it was', () => {
      setupComponent();
      fixture.componentInstance.onTabIndexChange(SidebarTabs.FAVORITES);
      fixture.componentInstance.setPanelExpanded(false);

      mapState().selectClickedMap(2);

      expect(fixture.componentInstance.panelExpanded).toBe(true);
      expect(fixture.componentInstance.tabIndex).toBe(SidebarTabs.FAVORITES);
    });

    it('browses to the layer whose name is clicked on a map', () => {
      setupComponent();
      fixture.componentInstance.onTabIndexChange(SidebarTabs.FAVORITES);
      fixture.componentInstance.setPanelExpanded(false);

      // only the data layers panel shows where a layer comes from
      mapState().goToLayerOnMap(2);

      expect(fixture.componentInstance.tabIndex).toBe(SidebarTabs.DATA_LAYERS);
      expect(fixture.componentInstance.panelExpanded).toBe(true);
    });
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
