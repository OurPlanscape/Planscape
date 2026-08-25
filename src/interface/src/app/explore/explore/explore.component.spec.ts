import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreComponent } from './explore.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { SharedModule } from '@shared';
import { SyncedMapsComponent } from '@maplibre-map/synced-maps/synced-maps.component';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExploreStorageService } from '@services/local-storage.service';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { ActivatedRoute } from '@angular/router';
import { ScenarioState } from '@app/scenario/scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { of } from 'rxjs';
import { Plan, Scenario } from '@app/types';
import { Geometry } from '@turf/helpers';


describe('ExploreComponent', () => {
  let fixture: ComponentFixture<ExploreComponent>;
  let breadcrumbService: BreadcrumbService;

  // Mutable route data object we can change per test
  const mockRouteSnapshotData: { planId?: number; scenarioId?: number } = {
    planId: 24,
    scenarioId: 1234,
  };

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ExploreComponent,
        SharedModule,
        MatTabsModule,
        BrowserAnimationsModule,
      ],
      providers: [
        MockProviders(BreadcrumbService, ExploreStorageService),
        MockProvider(PlanState, {
          currentPlanId$: of(24),
          currentPlan$: of(mockPlan),
        }),
        MockProvider(ScenarioState, {
          currentScenario$: of(mockScenario),
        }),
        // Point ActivatedRoute to our mutable object
        MockProvider(ActivatedRoute, {
          snapshot: { data: mockRouteSnapshotData } as any,
        }),
      ],
      declarations: [
        MockDeclarations(
          SyncedMapsComponent,
          NavBarComponent,
          BaseLayersComponent
        ),
      ],
    }).compileComponents();

    breadcrumbService = TestBed.inject(BreadcrumbService);
  });

  it('should use scenario breadcrumb label and backUrl when scenarioId, plan and scenario exist', (done) => {
    mockRouteSnapshotData.scenarioId = 1234;

    fixture = TestBed.createComponent(ExploreComponent);

    spyOn(breadcrumbService, 'updateBreadCrumb').and.callFake((config) => {
      expect(config.label).toEqual('Map Viewer: Test Scenario');
      expect(config.backUrl).toContain('/scenario/1234/dashboard');
      done();
    });

    fixture.detectChanges();
  });

  it('should fallback to plan breadcrumb when no scenarioId is present', (done) => {
    delete mockRouteSnapshotData.scenarioId;

    fixture = TestBed.createComponent(ExploreComponent);

    spyOn(breadcrumbService, 'updateBreadCrumb').and.callFake((config) => {
      expect(config.label).toEqual('Map Viewer: Test Plan');
      expect(config.backUrl).not.toContain('/scenario/');
      done();
    });

    fixture.detectChanges();
  });
});
