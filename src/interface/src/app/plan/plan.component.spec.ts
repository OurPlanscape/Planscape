import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { Plan, Region } from '@types';
import { MatDialogModule } from '@angular/material/dialog';
import { LegacyMaterialModule } from '../material/legacy-material.module';
import {
  AuthService,
  PlanningAreaNotesService,
  LegacyPlanStateService,
} from '@services';
import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { PlanComponent } from './plan.component';
import { PlanModule } from './plan.module';
import { MockComponent } from 'ng-mocks';
import { NavBarComponent } from '@shared';
import { MOCK_PLAN } from '@services/mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlanningAreaTitlebarMenuComponent } from '../standalone/planning-area-titlebar-menu/planning-area-titlebar-menu.component';

describe('PlanComponent', () => {
  let component: PlanComponent;
  let fixture: ComponentFixture<PlanComponent>;
  let mockAuthService: Partial<AuthService>;
  let mockNotesService: PlanningAreaNotesService;
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

    mockNotesService = jasmine.createSpyObj('PlanningAreaNotesService', [
      'getNotes',
      'addNote',
      'deleteNote',
    ]);
    Object.assign(mockNotesService, {
      modelName: 'planning_area',
      multipleUrl: 'mock-multiple-url',
      singleUrl: 'mock-single-url',
    });
    (mockNotesService.getNotes as jasmine.Spy).and.returnValue(of([]));

    const fakeService = jasmine.createSpyObj(
      'LegacyPlanStateService',
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
        LegacyMaterialModule,
        PlanModule,
        RouterTestingModule.withRoutes([]),
        NoopAnimationsModule,
        MatDialogModule,
        MatSnackBar,
      ],
      declarations: [
        PlanComponent,
        PlanMapComponent,
        PlanOverviewComponent,
        MockComponent(NavBarComponent),
        MockComponent(PlanningAreaTitlebarMenuComponent),
      ],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: AuthService, useValue: mockAuthService },
        { provide: LegacyPlanStateService, useValue: fakeService },
        { provide: PlanningAreaNotesService, useValue: mockNotesService },
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
    const legacyPlanStateService = fixture.debugElement.injector.get(
      LegacyPlanStateService
    );

    expect(legacyPlanStateService.updateStateWithPlan).toHaveBeenCalledOnceWith(
      24
    );
    expect(component.showOverview$.value).toBeTrue();
  });

  it('backToOverview navigates back to overview', () => {
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');

    component.backToOverview();

    expect(router.navigate).toHaveBeenCalledOnceWith(['plan', fakePlan.id]);
  });
});
