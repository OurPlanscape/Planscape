import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { Plan, Region } from '@types';

import { MaterialModule } from '../material/material.module';
import { AuthService, PlanStateService } from '@services';
import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { PlanComponent } from './plan.component';
import { PlanModule } from './plan.module';
import { MockComponent } from 'ng-mocks';
import { NavBarComponent } from '@shared';
import { MOCK_PLAN } from '@services/mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('PlanComponent', () => {
  let component: PlanComponent;
  let fixture: ComponentFixture<PlanComponent>;
  let mockAuthService: Partial<AuthService>;

  const fakeGeoJson: GeoJSON.GeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [10, 20],
                [10, 30],
                [15, 15],
              ],
            ],
          ],
        },
        properties: {
          shape_name: 'Test',
        },
      },
    ],
  };

  const fakePlan: Plan = { ...MOCK_PLAN, id: 24, geometry: fakeGeoJson };

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '24' }),
        },
      }
    );

    mockAuthService = {};

    const fakeService = jasmine.createSpyObj(
      'PlanStateService',
      {
        getPlan: of(fakePlan),
        getProjectsForPlan: of([]),
        updateStateWithPlan: of(),
        updateStateWithScenario: of(),
        getScenariosForPlan: of([]),
        updateStateWithShapes: of([]),
      },
      {
        planRegion$: new BehaviorSubject<Region>(Region.SIERRA_NEVADA),
      }
    );
    fakeService.planState$ = of({});

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MaterialModule,
        PlanModule,
        RouterTestingModule.withRoutes([]),
        NoopAnimationsModule,
      ],
      declarations: [
        PlanComponent,
        PlanMapComponent,
        PlanOverviewComponent,
        MockComponent(NavBarComponent),
      ],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PlanStateService, useValue: fakeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls service to update plan state based on route', () => {
    const planStateService =
      fixture.debugElement.injector.get(PlanStateService);

    expect(planStateService.updateStateWithPlan).toHaveBeenCalledOnceWith(24);
    expect(component.showOverview$.value).toBeTrue();
  });

  it('backToOverview navigates back to overview', () => {
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');

    component.backToOverview();

    expect(router.navigate).toHaveBeenCalledOnceWith(['plan', fakePlan.id]);
  });
});
