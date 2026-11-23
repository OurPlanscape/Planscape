import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ViewScenarioComponent } from './view-scenario.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { ScenarioState } from '../scenario.state';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MOCK_PLAN, MOCK_SCENARIO } from '@services/mocks';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { BehaviorSubject, of, ReplaySubject, Subject } from 'rxjs';
import {
  Plan,
  Scenario,
  SCENARIO_DETAIL_EVENTS,
  ScenarioResult,
  WorkspaceEvent,
} from '@types';
import { ScenarioResultsComponent } from '@scenario/scenario-results/scenario-results.component';
import { TreatmentsTabComponent } from '@scenario/treatments-tab/treatments-tab.component';
import { PlanState } from '@plan/plan.state';
import { ScenarioService, WebSocketService } from '@services';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MapModuleService } from '@services/map-module.service';
import { overrideFeatureFlags } from '@features/testing';

describe('ViewScenarioComponent', () => {
  let fixture: ComponentFixture<ViewScenarioComponent>;
  let component: ViewScenarioComponent;

  let scenario$!: ReplaySubject<Scenario>;
  let updates$!: Subject<WorkspaceEvent | null>;
  let scenarioUpdates$!: jasmine.Spy;
  let scenarioStateSpy!: { reloadScenario: jasmine.Spy; currentScenario$: any };
  let currentPlanOrNull$!: BehaviorSubject<Plan | null>;
  let loadMapModule!: jasmine.Spy;

  const SCENARIO_ID = 7;

  /** What the component reads off the route: the ids of the page it is on. */
  const routeStub = {
    snapshot: {
      data: { scenarioId: SCENARIO_ID },
      parent: { data: { planId: 3 } },
      pathFromRoot: [],
      firstChild: null,
    },
  };

  const baseScenario: Scenario = {
    ...MOCK_SCENARIO,
    scenario_result: { status: 'PENDING' } as ScenarioResult,
    geopackage_status: null,
  };

  function makeScenario(status: ScenarioResult['status']): Scenario {
    return { ...baseScenario, scenario_result: { status } as ScenarioResult };
  }

  /** One event on the channel of this scenario. */
  function somethingChanged() {
    updates$.next({ type: 'planning.scenario.status_changed' });
  }

  beforeEach(async () => {
    scenario$ = new ReplaySubject<Scenario>(1);
    updates$ = new Subject<WorkspaceEvent | null>();
    scenarioUpdates$ = jasmine
      .createSpy('scenarioUpdates$')
      .and.returnValue(updates$);
    scenarioStateSpy = {
      reloadScenario: jasmine.createSpy('reloadScenario'),
      currentScenario$: scenario$.asObservable(),
    };
    currentPlanOrNull$ = new BehaviorSubject<Plan | null>(MOCK_PLAN);
    loadMapModule = jasmine.createSpy('loadMapModule').and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [
        MockDeclarations(DataLayersComponent, BaseLayersComponent),
      ],
      imports: [
        MatDialogModule,
        RouterTestingModule,
        ScenarioResultsComponent,
        TreatmentsTabComponent,
        ViewScenarioComponent,
      ],
      providers: [
        MockProvider(PlanState, { currentPlanOrNull$ }),
        MockProviders(ScenarioService),
        MockProvider(MapModuleService, { loadMapModule }),
        MockProvider(DataLayersStateService, { paths$: of([]) }),
        MockProvider(WebSocketService, { scenarioUpdates$ }),
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: ScenarioState, useValue: scenarioStateSpy },
      ],
    }).compileComponents();

    TestBed.overrideComponent(ViewScenarioComponent, {});
  });

  function createComponent() {
    fixture = TestBed.createComponent(ViewScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    scenario$.next(makeScenario('SUCCESS'));
    createComponent();

    expect(component).toBeTruthy();
  });

  describe('map module', () => {
    beforeEach(() => {
      scenario$.next(makeScenario('SUCCESS'));
      overrideFeatureFlags('DATA_ORGANIZATION');
    });

    it("loads it narrowed to the plan's geometry", () => {
      createComponent();
      expect(loadMapModule).toHaveBeenCalledOnceWith(MOCK_PLAN.geometry);
    });

    it('loads it unfiltered when DATA_ORGANIZATION is off', () => {
      overrideFeatureFlags();
      createComponent();
      expect(loadMapModule).toHaveBeenCalledOnceWith(undefined);
    });

    it('does not reload when the same plan emits again', () => {
      createComponent();
      currentPlanOrNull$.next({ ...MOCK_PLAN });
      expect(loadMapModule).toHaveBeenCalledTimes(1);
    });
  });

  it('reads the scenario back when an event beats the first read', () => {
    createComponent();

    somethingChanged();

    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);
  });

  it('reads the scenario back when the run reports a change', () => {
    scenario$.next(makeScenario('PENDING'));
    createComponent();

    expect(scenarioStateSpy.reloadScenario).not.toHaveBeenCalled();

    somethingChanged();
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);

    somethingChanged();
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);
  });

  it('listens on the channel of this scenario, for what changes its page', () => {
    scenario$.next(makeScenario('PENDING'));
    createComponent();

    expect(scenarioUpdates$).toHaveBeenCalledWith(
      SCENARIO_ID,
      SCENARIO_DETAIL_EVENTS
    );
  });

  it('stops reading it back once the run is done', () => {
    scenario$.next(makeScenario('PENDING'));
    createComponent();
    somethingChanged();

    scenario$.next(makeScenario('SUCCESS'));
    somethingChanged();

    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);
  });

  it('does not read it back for a run that was already done', () => {
    scenario$.next(makeScenario('SUCCESS'));
    createComponent();

    somethingChanged();

    expect(scenarioStateSpy.reloadScenario).not.toHaveBeenCalled();
  });

  it('follows the geopackage while it is being built', () => {
    scenario$.next(makeScenario('SUCCESS'));
    createComponent();

    scenario$.next({
      ...makeScenario('SUCCESS'),
      geopackage_status: 'PENDING',
    } as Scenario);
    somethingChanged();
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);

    scenario$.next({
      ...makeScenario('SUCCESS'),
      geopackage_status: 'PROCESSING',
    } as Scenario);
    somethingChanged();
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);

    // any value other than PENDING/PROCESSING means there is nothing to wait for
    scenario$.next({
      ...makeScenario('SUCCESS'),
      geopackage_status: 'SUCCEEDED',
    } as Scenario);
    somethingChanged();
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);
  });

  it('stops listening once it goes away', () => {
    scenario$.next(makeScenario('PENDING'));
    createComponent();
    somethingChanged();

    fixture.destroy();
    somethingChanged();

    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);
  });
});
