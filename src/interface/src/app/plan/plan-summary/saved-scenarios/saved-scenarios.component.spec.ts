import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { LegacyMaterialModule } from '@app/material/legacy-material.module';
import { SavedScenariosComponent } from '@app/plan/plan-summary/saved-scenarios/saved-scenarios.component';
import { POLLING_INTERVAL } from '@app/plan/plan-helpers';
import { By } from '@angular/platform-browser';
import { SectionLoaderComponent, TypeSafeMatCellDef } from '@shared';
import { CurrencyPipe } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';

import { AuthService, ScenarioService } from '@services';
import { MockComponent, MockProvider } from 'ng-mocks';
import { FeaturesModule } from '@app/features/features.module';
import { MOCK_PLAN } from '@services/mocks';
import { ButtonComponent } from '@styleguide';
import { MatTabsModule } from '@angular/material/tabs';
import { ScenariosCardListComponent } from '@app/plan/plan-summary/scenarios-card-list/scenarios-card-list.component';
import { RouterTestingModule } from '@angular/router/testing';
import { PlanState } from '@app/plan/plan.state';
import { MatCardModule } from '@angular/material/card';

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

//Flaky test- disabling
describe('SavedScenariosComponent (updated polling/manual preemption)', () => {
  let component: SavedScenariosComponent;
  let fixture: ComponentFixture<SavedScenariosComponent>;
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
        MatTabsModule,
        MatCardModule,
        RouterTestingModule,
      ],
      declarations: [
        SavedScenariosComponent,
        TypeSafeMatCellDef,
        MockComponent(SectionLoaderComponent),
        MockComponent(ScenariosCardListComponent),
      ],
      providers: [
        CurrencyPipe,
        MockProvider(AuthService),
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: ScenarioService, useValue: scenarioSvcSpy },
        MockProvider(PlanState, {
          currentPlan$: mockPlan$,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedScenariosComponent);
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
    // trigger AFTER poll subscriptions are wired up
    component.fetchScenarios();

    expect(scenarioSvcSpy.getScenariosForPlan).toHaveBeenCalledTimes(1);
    expect(scenarioSvcSpy.getScenariosForPlan).toHaveBeenCalledWith(
      '24' as any,
      '-created_at'
    );
    expect(component.activeScenarios.length).toBe(1);
  });

  it('should poll after the first interval immediately', fakeAsync(() => {
    fixture.detectChanges();
    // no call until first interval tick
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(0);

    // before first interval tick → no call
    tick(POLLING_INTERVAL - 1);
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(1);

    // first poll tick
    tick(1);
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(2);

    // second poll tick
    tick(POLLING_INTERVAL);
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(3);

    discardPeriodicTasks();
  }));

  it('skips poll ticks while a previous poll request is in flight (exhaustMap)', fakeAsync(() => {
    // Call #1 (manual): immediate
    // Call #2 (first poll): long-running
    // Subsequent polls while #2 active should be ignored

    const longPoll$ = new Subject<any[]>();

    // Return specific observables in strict order per invocation
    scenarioSvcSpy.getScenariosForPlan.and.returnValues(
      of([makeScenario(1)]), // 1) manual
      longPoll$.asObservable(), // 2) first poll (in-flight)
      of([makeScenario(1)]) // 3) later poll after completion
    );

    fixture.detectChanges();

    // trigger manual fetch so we have an initial state and to align call indices
    component.fetchScenarios();
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(1); // manual

    // first poll tick → starts long-running poll
    tick(POLLING_INTERVAL);
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(2);

    // another full interval passes but longPoll$ still active → NO new call
    tick(POLLING_INTERVAL);
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(2);

    // complete the long request now
    longPoll$.next([makeScenario(1)]);
    longPoll$.complete();

    // next interval should trigger a new poll
    tick(POLLING_INTERVAL);
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(3);

    discardPeriodicTasks();
  }));

  it('manual fetch preempts an in-flight poll and prevents stale overwrite', fakeAsync(() => {
    // Sequence:
    // 1) manual: returns [1]
    // 2) first poll: in-flight (Subject)
    // 3) manual trigger: returns [] and should cancel #2
    // 4) if #2 later emits [1], it MUST NOT overwrite state

    const pollSubject = new Subject<any[]>();

    let callIndex = 0;
    scenarioSvcSpy.getScenariosForPlan.and.callFake(() => {
      callIndex++;
      if (callIndex === 1) {
        return of([makeScenario(1)]); // manual
      }
      if (callIndex === 2) {
        return pollSubject.asObservable(); // first poll (in-flight)
      }
      if (callIndex === 3) {
        return of([]); // manual refresh result after removal
      }
      return of([]);
    });

    fixture.detectChanges();

    // Do an explicit manual fetch to populate initial list
    component.fetchScenarios();

    // After manual call
    expect(component.activeScenarios.map((s) => s.id)).toEqual([1]);

    // Let the poll start
    tick(POLLING_INTERVAL);
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(2);

    // Simulate user removal → locally remove + manual refresh
    component.removeScenarioFromList(makeScenario(1), 'activeScenarios');
    // manual refresh subscribes immediately
    expect(scenarioSvcSpy.getScenariosForPlan.calls.count()).toBe(3);

    // After manual completes, list should be []
    expect(component.activeScenarios.length).toBe(0);

    // Now, if the *old poll* emits, it should not overwrite (because it was canceled)
    pollSubject.next([makeScenario(1)]);
    pollSubject.complete();

    // No change expected — still []
    expect(component.activeScenarios.length).toBe(0);

    discardPeriodicTasks();
  }));

  it('permission gating: shows New Scenario with add_scenario', () => {
    mockPlan$.next({ ...mockPlan$.value, permissions: ['add_scenario'] });
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('[data-id="new-scenario"]'));
    expect(btn).not.toBeNull();
  });

  it('permission gating: hides New Scenario without add_scenario', () => {
    mockPlan$.next({ ...mockPlan$.value, permissions: ['nothing_here'] });
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('[data-id="new-scenario"]'));
    expect(btn).toBeNull();
  });
});
