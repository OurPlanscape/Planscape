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
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { PlanningAreaNotesService } from '@services';
import { PlanComponent } from './plan.component';
import { PlanModule } from './plan.module';
import { NavBarComponent } from '@shared';
import { MOCK_PLAN } from '@services/mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlanningAreaTitlebarMenuComponent } from '@standalone/planning-area-titlebar-menu/planning-area-titlebar-menu.component';
import { MockDeclaration } from 'ng-mocks';

describe('PlanComponent', () => {
  let router: Router;

  // shared fakes/mocks
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

    const fakeRoute: Partial<ActivatedRoute> = {
      snapshot: {
        paramMap: convertToParamMap({ planId: '24' }),
        url: [],
      } as any,
      firstChild: mockChildRoute as any,
      children: [mockChildRoute as any],
    };

    mockNotesService = jasmine.createSpyObj('PlanningAreaNotesService', [
      'getNotes',
      'addNote',
      'deleteNote',
    ]) as unknown as PlanningAreaNotesService;

    (mockNotesService.getNotes as unknown as jasmine.Spy).and.returnValue(
      of([])
    );
    Object.assign(mockNotesService, {
      modelName: 'planning_area',
      multipleUrl: 'mock-multiple-url',
      singleUrl: 'mock-single-url',
    });

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        NoopAnimationsModule,
        MatDialogModule,
        // keep these if your PlanComponent template relies on them
        LegacyMaterialModule,
        PlanModule,
      ],
      // Declare component under test and mock any child components used in its template.
      declarations: [
        PlanComponent,
        MockDeclaration(NavBarComponent),
        MockDeclaration(PlanningAreaTitlebarMenuComponent),
      ],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: PlanningAreaNotesService, useValue: mockNotesService },
        {
          provide: MatSnackBar,
          useValue: jasmine.createSpyObj('MatSnackBar', [
            'open',
            'openFromComponent',
            'dismiss',
          ]),
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  // utility to create the component fresh per test
  function create(): ComponentFixture<PlanComponent> {
    const fixture = TestBed.createComponent(PlanComponent);
    return fixture;
  }

  it('should create', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    (component as any).plan = fakePlan;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('backToOverview navigates back to overview', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    (component as any).plan = fakePlan;
    fixture.detectChanges();

    const navSpy = spyOn(router, 'navigate');

    component.backToOverview();

    expect(navSpy).toHaveBeenCalledOnceWith(['plan', fakePlan.id.toString()]);
  });

  // --- constructor behavior (checkForInProgressModal) ---

  it('opens modal and clears history when flag is present in navigation extras', () => {
    // Arrange BEFORE creating the component (constructor reads it)
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

    // setup test
    const fixture = create();
    const component = fixture.componentInstance;
    (component as any).plan = fakePlan;
    fixture.detectChanges();

    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalled();
    const lastArgs = replaceSpy.calls.mostRecent().args;
    expect(lastArgs[0]).toEqual({ foo: 'bar' });
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

    const fixture = create();
    const component = fixture.componentInstance;
    (component as any).plan = fakePlan;
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

    const fixture = create();
    const component = fixture.componentInstance;
    (component as any).plan = fakePlan;
    fixture.detectChanges();

    expect(showSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
