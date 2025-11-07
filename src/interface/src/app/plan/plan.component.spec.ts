import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  Navigation,
  Router,
} from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { Plan } from '@types';
import { MatDialogModule } from '@angular/material/dialog';
import { LegacyMaterialModule } from '../material/legacy-material.module';
import { AuthService, PlanningAreaNotesService } from '@services';
import { PlanComponent } from './plan.component';
import { PlanModule } from './plan.module';
import { MockComponent } from 'ng-mocks';
import { NavBarComponent } from '@shared';
import { MOCK_PLAN } from '@services/mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlanningAreaTitlebarMenuComponent } from '../standalone/planning-area-titlebar-menu/planning-area-titlebar-menu.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

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
    const mockChildRoute = {
      snapshot: {
        params: { id: 'scenario-99' },
        data: { showOverview: true },
        url: [{ path: 'scenario' }],
        paramMap: convertToParamMap({
          scenarioId: 'scenario-99',
        }),
      },
      data: of({ showOverview: true }),
      firstChild: null,
    };

    const fakeRoute = {
      snapshot: {
        paramMap: convertToParamMap({ planId: '24' }),
        url: [],
      },
      firstChild: mockChildRoute,
      children: [mockChildRoute],
    };

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
        MockComponent(NavBarComponent),
        MockComponent(PlanningAreaTitlebarMenuComponent),
      ],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PlanningAreaNotesService, useValue: mockNotesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanComponent);
    component = fixture.componentInstance;
    (component as any).plan = fakePlan; // ensure backToOverview has an id
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('backToOverview navigates back to overview', () => {
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');

    component.backToOverview();

    expect(router.navigate).toHaveBeenCalledOnceWith([
      'plan',
      fakePlan.id.toString(),
    ]);
  });
});

/**
 * Constructor-focused tests for checkForInProgressModal().
 * Includes HttpClientTestingModule to satisfy any HttpClient chains.
 * Uses NO_ERRORS_SCHEMA to ignore template noise.
 */
describe('PlanComponent – checkForInProgressModal (constructor behavior)', () => {
  let router: Router;

  const stubAuth: Partial<AuthService> = {};
  const stubNotes = {
    getNotes: () => of([]),
    addNote: () => of(null),
    deleteNote: () => of(null),
    modelName: 'planning_area',
    multipleUrl: 'mock-multiple-url',
    singleUrl: 'mock-single-url',
  } as unknown as PlanningAreaNotesService;

  const stubActivatedRoute: Partial<ActivatedRoute> = {
    snapshot: {
      paramMap: convertToParamMap({ planId: '24' }),
      url: [],
    } as any,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule, // <-- fixes NullInjectorError(HttpClient)
        RouterTestingModule.withRoutes([]),
        NoopAnimationsModule,
        MatDialogModule,
      ],
      declarations: [PlanComponent],
      providers: [
        { provide: ActivatedRoute, useValue: stubActivatedRoute },
        { provide: AuthService, useValue: stubAuth },
        { provide: PlanningAreaNotesService, useValue: stubNotes },
        {
          provide: MatSnackBar,
          useValue: jasmine.createSpyObj('MatSnackBar', [
            'open',
            'openFromComponent',
            'dismiss',
          ]),
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('opens modal and clears history when flag is present in navigation extras', () => {
    spyOn(router, 'getCurrentNavigation').and.returnValue({
      id: 1,
      initialUrl: router.parseUrl('/plan/24'),
      extractedUrl: router.parseUrl('/plan/24'),
      trigger: 'imperative',
      previousNavigation: null,
      extras: { state: { showInProgressModal: true } },
      finalUrl: router.parseUrl('/plan/24'),
    } as unknown as Navigation);

    window.history.replaceState(
      { showInProgressModal: true, foo: 'bar' },
      document.title
    );
    const replaceSpy = spyOn(window.history, 'replaceState').and.callThrough();

    const showSpy = spyOn(
      PlanComponent.prototype as any,
      'showInProgressModal'
    );

    const fixture = TestBed.createComponent(PlanComponent);
    fixture.detectChanges();

    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalled();
    const lastArgs = replaceSpy.calls.mostRecent().args;
    expect(lastArgs[0]).toEqual({ foo: 'bar' }); // flag removed
  });

  it('does nothing when the flag is missing', () => {
    spyOn(router, 'getCurrentNavigation').and.returnValue({
      id: 2,
      initialUrl: router.parseUrl('/plan/24'),
      extractedUrl: router.parseUrl('/plan/24'),
      trigger: 'imperative',
      previousNavigation: null,
      extras: { state: {} }, // no flag
      finalUrl: router.parseUrl('/plan/24'),
    } as unknown as Navigation);

    const showSpy = spyOn(
      PlanComponent.prototype as any,
      'showInProgressModal'
    );
    const replaceSpy = spyOn(window.history, 'replaceState');

    const fixture = TestBed.createComponent(PlanComponent);
    fixture.detectChanges();

    expect(showSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('does nothing when getCurrentNavigation() is null', () => {
    spyOn(router, 'getCurrentNavigation').and.returnValue(null);

    const showSpy = spyOn(
      PlanComponent.prototype as any,
      'showInProgressModal'
    );
    const replaceSpy = spyOn(window.history, 'replaceState');

    const fixture = TestBed.createComponent(PlanComponent);
    fixture.detectChanges();

    expect(showSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
