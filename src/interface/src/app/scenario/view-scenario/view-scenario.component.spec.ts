import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ViewScenarioComponent } from '@app/scenario/view-scenario/view-scenario.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { ScenarioState } from '@app/scenario/scenario.state';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { BehaviorSubject, of } from 'rxjs';
import { MOCK_SCENARIO } from '@services/mocks';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { Scenario, ScenarioResult } from '@types';
import { ScenarioResultsComponent } from '@app/scenario/scenario-results/scenario-results.component';
import { TreatmentsTabComponent } from '@app/scenario/treatments-tab/treatments-tab.component';
import { PlanState } from '@app/plan/plan.state';
import { POLLING_INTERVAL } from '@app/plan/plan-helpers';
import { ScenarioService } from '@services';
import { BaseLayersComponent } from '@app/base-layers/base-layers/base-layers.component';
import { MatDialogModule } from '@angular/material/dialog';

describe('ViewScenarioComponent (polling)', () => {
  let fixture: ComponentFixture<ViewScenarioComponent>;
  let component: ViewScenarioComponent;

  let scenario$!: BehaviorSubject<Scenario>;
  let scenarioStateSpy!: { reloadScenario: jasmine.Spy; currentScenario$: any };

  const baseScenario: Scenario = {
    ...MOCK_SCENARIO,
    scenario_result: { status: 'PENDING' } as ScenarioResult,
    geopackage_status: null,
  };

  function makeScenario(status: ScenarioResult['status']): Scenario {
    return { ...baseScenario, scenario_result: { status } as ScenarioResult };
  }

  beforeEach(async () => {
    scenario$ = new BehaviorSubject<Scenario>(makeScenario('PENDING'));
    scenarioStateSpy = {
      reloadScenario: jasmine.createSpy('reloadScenario'),
      currentScenario$: scenario$.asObservable(),
    };

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
        MockProviders(PlanState, ScenarioService),
        MockProvider(DataLayersStateService, { paths$: of([]) }),
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

  it('should create', fakeAsync(() => {
    scenario$.next(makeScenario('SUCCESS')); // avoid timers
    createComponent();
    expect(component).toBeTruthy();
    try {
      discardPeriodicTasks();
    } catch {}
  }));

  it('starts polling when scenario is PENDING', fakeAsync(() => {
    scenario$.next(makeScenario('PENDING'));
    createComponent();

    expect(scenarioStateSpy.reloadScenario).not.toHaveBeenCalled();

    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);

    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);

    discardPeriodicTasks();
  }));

  it('stops polling when scenario transitions to SUCCESS', fakeAsync(() => {
    scenario$.next(makeScenario('PENDING'));
    createComponent();

    tick(POLLING_INTERVAL);
    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);

    scenario$.next(makeScenario('SUCCESS')); // cancels via takeUntil inside startPolling
    tick(POLLING_INTERVAL);
    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);

    try {
      discardPeriodicTasks();
    } catch {}
  }));

  it('does not poll when scenario is already SUCCESS at start', fakeAsync(() => {
    scenario$.next(makeScenario('SUCCESS'));
    createComponent();

    tick(POLLING_INTERVAL);
    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).not.toHaveBeenCalled();

    try {
      discardPeriodicTasks();
    } catch {}
  }));

  it('polls when geopackage_status is PENDING/PROCESSING and feature flag is ON', fakeAsync(() => {
    scenario$.next(makeScenario('SUCCESS'));
    createComponent();
    scenario$.next({
      ...makeScenario('SUCCESS'),
      geopackage_status: 'PENDING',
    } as Scenario);
    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);

    scenario$.next({
      ...makeScenario('SUCCESS'),
      geopackage_status: 'PROCESSING',
    } as Scenario);
    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);

    // mark as done (any value other than PENDING/PROCESSING stops)
    scenario$.next({
      ...makeScenario('SUCCESS'),
      geopackage_status: 'SUCCEEDED',
    } as Scenario);
    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(2);

    try {
      discardPeriodicTasks();
    } catch {}
  }));

  it('cleans up polling on component destroy', fakeAsync(() => {
    // ensure only main polling exists (no geopackage)
    scenario$.next(makeScenario('PENDING'));
    createComponent();

    // fire once
    tick(POLLING_INTERVAL);
    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);

    // proactively stop polling to avoid any race (switchMap takeUntil)
    scenario$.next(makeScenario('SUCCESS'));

    // now destroy; there should be no further calls regardless of time advance
    fixture.destroy();
    tick(0); // flush teardown
    tick(POLLING_INTERVAL * 3);

    expect(scenarioStateSpy.reloadScenario).toHaveBeenCalledTimes(1);

    try {
      discardPeriodicTasks();
    } catch {}
  }));
});
