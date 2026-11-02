import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { By } from '@angular/platform-browser';
import { SectionLoaderComponent, TypeSafeMatCellDef } from '@shared';
import { CurrencyPipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AuthService, ScenarioService, WebSocketService } from '@services';
import { SCENARIO_LIST_EVENTS, WorkspaceEvent } from '@types';
import { MockComponent, MockProvider } from 'ng-mocks';
import { FeaturesModule } from '@features/features.module';
import { MOCK_PLAN } from '@services/mocks';
import { ButtonComponent } from '@styleguide';
import { ScenariosCardListComponent } from '@plan/plan-summary/scenarios-card-list/scenarios-card-list.component';
import { RouterTestingModule } from '@angular/router/testing';
import { PlanState } from '@plan/plan.state';
import { MatCardModule } from '@angular/material/card';
import {
  ScenarioRow,
  ScenariosListComponent,
} from './scenarios-list.component';

// Helper to build a minimal ScenarioRow
function makeScenario(id: number) {
  return {
    id,
    name: 'S' + id,
    planning_area: 1,
    createdTimestamp: 100 + id,
    configuration: { id: 1, max_budget: 200 },
    status: 'ACTIVE',
    geopackage_status: 'PENDING',
    geopackage_url: null,
  } as any;
}
const updates$ = new Subject<WorkspaceEvent | null>();
const planUpdatesSpy = jasmine.createSpy('planUpdates$');
const webSocketServiceMock = () => ({
  planUpdates$: planUpdatesSpy.and.returnValue(updates$),
});

describe('ScenariosListComponent (live updates)', () => {
  let component: ScenariosListComponent;
  let fixture: ComponentFixture<ScenariosListComponent>;
  let scenarioSvcSpy: jasmine.SpyObj<ScenarioService>;
  const mockPlan$ = new BehaviorSubject({
    ...MOCK_PLAN,
    permissions: ['add_scenario'],
    user: 1,
  });

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          params: {
            planId: '24',
          },
        },
      }
    );

    scenarioSvcSpy = jasmine.createSpyObj<ScenarioService>('ScenarioService', {
      getScenariosForPlan: of([makeScenario(1)]), // default immediate response
    });

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        LegacyMaterialModule,
        MatDialogModule,
        NoopAnimationsModule,
        FeaturesModule,
        ButtonComponent,
        MatCardModule,
        RouterTestingModule,
      ],
      declarations: [
        ScenariosListComponent,
        TypeSafeMatCellDef,
        MockComponent(SectionLoaderComponent),
        MockComponent(ScenariosCardListComponent),
      ],
      providers: [
        CurrencyPipe,
        MockProvider(AuthService),
        { provide: WebSocketService, useValue: webSocketServiceMock() },
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: ScenarioService, useValue: scenarioSvcSpy },
        MockProvider(PlanState, {
          currentPlan$: mockPlan$,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenariosListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // reset spy between tests
    scenarioSvcSpy.getScenariosForPlan.calls.reset();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('manual fetch triggers a request and populates lists', () => {
    fixture.detectChanges();
    scenarioSvcSpy.getScenariosForPlan.calls.reset();

    component.fetchScenarios();

    expect(scenarioSvcSpy.getScenariosForPlan).toHaveBeenCalledTimes(1);
    expect(scenarioSvcSpy.getScenariosForPlan).toHaveBeenCalledWith(
      '24' as any,
      '-created_at'
    );
    expect(component.activeScenarios.length).toBe(1);
  });

  it('fetches once on load and stays quiet until something changes', () => {
    fixture.detectChanges();

    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(1);
  });

  it('listens to the scenarios of this plan', () => {
    fixture.detectChanges();

    expect(planUpdatesSpy).toHaveBeenCalledWith(24, SCENARIO_LIST_EVENTS);
  });

  it('fetches again when the scenarios change', () => {
    fixture.detectChanges();

    updates$.next(null);

    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(2);
  });

  it('keeps listening after a fetch fails', () => {
    fixture.detectChanges();

    scenarioSvcSpy.getScenariosForPlan.and.returnValue(
      throwError(() => new Error('nope'))
    );
    updates$.next(null);

    scenarioSvcSpy.getScenariosForPlan.and.returnValue(of([]));
    updates$.next(null);

    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(3);
  });

  it('a newer fetch cancels one in flight so stale results never land', () => {
    fixture.detectChanges();
    expect(component.activeScenarios.map((s) => s.id)).toEqual([1]);

    const inFlight$ = new Subject<any[]>();
    scenarioSvcSpy.getScenariosForPlan.and.returnValue(inFlight$);
    updates$.next(null);

    scenarioSvcSpy.getScenariosForPlan.and.returnValue(of([]));
    component.fetchScenarios();
    expect(component.activeScenarios.length).toBe(0);

    inFlight$.next([makeScenario(1)]);

    expect(component.activeScenarios.length).toBe(0);
  });

  it('permission gating: shows New Scenario with add_scenario', () => {
    component.activeScenarios.length = 1; // button header won't appear unless we have at least 1 scenario
    mockPlan$.next({ ...mockPlan$.value, permissions: ['add_scenario'] });
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('[data-id="new-scenario"]'));
    expect(btn).not.toBeNull();
  });

  it('permission gating: hides New Scenario without add_scenario', () => {
    component.activeScenarios.length = 1; // button header won't appear unless we have at least 1 scenario
    mockPlan$.next({ ...mockPlan$.value, permissions: ['nothing_here'] });
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('[data-id="new-scenario"]'));
    expect(btn).toBeNull();
  });
});

describe('ScenariosListComponent should support various modes', () => {
  let component: ScenariosListComponent;
  let fixture: ComponentFixture<ScenariosListComponent>;
  let scenarioSvcSpy: jasmine.SpyObj<ScenarioService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  const mockPlan$ = new BehaviorSubject({
    ...MOCK_PLAN,
    id: 24,
    permissions: ['add_scenario'],
    user: 1,
  });

  function configureTestBed() {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          params: {
            planId: '24',
          },
        },
      }
    );

    scenarioSvcSpy = jasmine.createSpyObj<ScenarioService>('ScenarioService', {
      getScenariosForPlan: of([makeScenario(1)]),
      getProjectAreaChildScenarios: of([makeScenario(1)]),
    });

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    return TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        LegacyMaterialModule,
        MatDialogModule,
        NoopAnimationsModule,
        FeaturesModule,
        ButtonComponent,
        MatCardModule,
        RouterTestingModule,
      ],
      declarations: [
        ScenariosListComponent,
        TypeSafeMatCellDef,
        MockComponent(SectionLoaderComponent),
        MockComponent(ScenariosCardListComponent),
      ],
      providers: [
        CurrencyPipe,
        MockProvider(AuthService),
        { provide: WebSocketService, useValue: webSocketServiceMock() },
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: ScenarioService, useValue: scenarioSvcSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatDialog, useValue: dialogSpy },
        MockProvider(PlanState, {
          currentPlan$: mockPlan$,
        }),
      ],
    }).compileComponents();
  }

  describe('default (plan) mode', () => {
    beforeEach(async () => {
      await configureTestBed();
      fixture = TestBed.createComponent(ScenariosListComponent);
      component = fixture.componentInstance;
    });

    it('defaults mode to "plan" when not set', () => {
      fixture.detectChanges();
      expect(component.mode).toBe('plan');
    });

    it('fetches via getScenariosForPlan using the route planId', () => {
      fixture.detectChanges();
      component.fetchScenarios();

      expect(scenarioSvcSpy.getScenariosForPlan).toHaveBeenCalledWith(
        '24' as any,
        '-created_at'
      );
      expect(
        scenarioSvcSpy.getProjectAreaChildScenarios
      ).not.toHaveBeenCalled();
    });

    it('routes finished scenarios to the dashboard with a relative path', () => {
      fixture.detectChanges();
      const scenario = {
        ...makeScenario(1),
        scenario_result: { status: 'SUCCESS' },
      } as unknown as ScenarioRow;

      component.navigateToScenario(scenario);

      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['scenario', scenario.id, 'dashboard'],
        { relativeTo: (component as any).route }
      );
    });
  });

  describe('project-area mode', () => {
    beforeEach(async () => {
      await configureTestBed();
      fixture = TestBed.createComponent(ScenariosListComponent);
      component = fixture.componentInstance;
      component.mode = 'project-area';
      component.projectAreaId = 42;
    });

    it('throws on init if projectAreaId is missing', () => {
      component.projectAreaId = undefined;
      expect(() => fixture.detectChanges()).toThrowError(
        'ScenariosListComponent: projectAreaId is required when mode is "project-area"'
      );
    });

    it('fetches via getProjectAreaChildScenarios using projectAreaId, not the plan fetch', () => {
      fixture.detectChanges();
      component.fetchScenarios();

      expect(scenarioSvcSpy.getProjectAreaChildScenarios).toHaveBeenCalledWith(
        42,
        '-created_at'
      );
      expect(scenarioSvcSpy.getScenariosForPlan).not.toHaveBeenCalled();
    });

    it('navigates with an absolute /plan/:id prefix', () => {
      fixture.detectChanges();
      const scenario = { ...makeScenario(1), planning_area: 1 } as ScenarioRow;

      component.navigateToScenario(scenario);

      expect(routerSpy.navigate).toHaveBeenCalledWith([
        `/plan/${mockPlan$.value.id}`,
        'scenario',
        scenario.id,
      ]);
    });

    it('keeps the workspace prefix when nested under a workspace', () => {
      (TestBed.inject(ActivatedRoute).snapshot as any).pathFromRoot = [
        { paramMap: convertToParamMap({ workspaceId: '7' }) },
      ];
      fixture.detectChanges();
      const scenario = { ...makeScenario(1), planning_area: 1 } as ScenarioRow;

      component.navigateToScenario(scenario);

      expect(routerSpy.navigate).toHaveBeenCalledWith([
        `/workspace/7/plan/${mockPlan$.value.id}`,
        'scenario',
        scenario.id,
      ]);
    });

    it('routes finished scenarios to the fullview under the /plan prefix', () => {
      fixture.detectChanges();
      const scenario = {
        ...makeScenario(1),
        scenario_result: { status: 'FAILURE' },
      } as unknown as ScenarioRow;

      component.navigateToScenario(scenario);

      expect(routerSpy.navigate).toHaveBeenCalledWith([
        `/plan/${mockPlan$.value.id}`,
        'scenario',
        scenario.id,
      ]);
    });
  });
});
