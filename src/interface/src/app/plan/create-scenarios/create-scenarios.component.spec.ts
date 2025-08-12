import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { GeoPackageStatus, ScenarioResultStatus } from '@types';

import { PlanModule } from '../plan.module';
import {
  CreateScenariosComponent,
  ScenarioTabs,
} from './create-scenarios.component';
import { RouterTestingModule } from '@angular/router/testing';
import { POLLING_INTERVAL } from '../plan-helpers';
import { CurrencyPipe } from '@angular/common';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { ActivatedRoute } from '@angular/router';
import { ConstraintsPanelComponent } from './constraints-panel/constraints-panel.component';
import { SetPrioritiesComponent } from './set-priorities/set-priorities.component';
import { PlanState } from '../plan.state';
import { BehaviorSubject } from 'rxjs';
import { MOCK_PLAN, MOCK_SCENARIO } from '@services/mocks';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { ScenarioService } from '@services';
import { FormControl, FormGroup } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('CreateScenariosComponent', () => {
  let component: CreateScenariosComponent;
  let fixture: ComponentFixture<CreateScenariosComponent>;

  let mockPlan$ = new BehaviorSubject(MOCK_PLAN);
  let mockScenario$ = new BehaviorSubject(MOCK_SCENARIO);
  let mockScenarioId$ = new BehaviorSubject(1);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        BrowserAnimationsModule,
        HttpClientTestingModule,
        PlanModule,
        RouterTestingModule,
      ],
      declarations: [
        CreateScenariosComponent,
        MockDeclarations(
          DataLayersComponent,
          ConstraintsPanelComponent,
          SetPrioritiesComponent
        ),
      ],
      providers: [
        CurrencyPipe,
        {
          provide: ActivatedRoute,
          useValue: {
            parent: {
              snapshot: {
                data: {
                  planId: MOCK_PLAN.id,
                },
              },
            },
            snapshot: {
              data: {
                scenarioId: 456,
              },
            },
          },
        },
        MockProvider(PlanState, {
          currentPlan$: mockPlan$,
        }),
        MockProvider(ScenarioState, {
          currentScenarioId$: mockScenarioId$,
          currentScenario$: mockScenario$,
        }),
        MockProvider(ScenarioService, {
          getScenariosForPlan: () => new BehaviorSubject([]),
          getScenario: () => mockScenario$,
          getExcludedAreas: () => new BehaviorSubject([]),
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    spyOn(component, 'pollForChanges');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize scenario  correctly', async () => {
    spyOn(component, 'createForms').and.returnValue(Promise.resolve());
    spyOn(component, 'setExistingNameValidator');
    spyOn(component, 'setScenarioMode');

    // Calling init scenario
    await component.initScenario();

    // We should call all the methods we need
    expect(component.createForms).toHaveBeenCalled();
    expect(component.setExistingNameValidator).toHaveBeenCalled();
    expect(component.setScenarioMode).toHaveBeenCalled();
  });

  it('should create forms correctly', async () => {
    // Mocking constraintsPanelComponent
    component.constraintsPanelComponent = {
      loadExcludedAreas: jasmine.createSpy().and.returnValue(Promise.resolve()),
      createForm: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve(new FormGroup({}))),
    } as any;

    // Mocking prioritiesComponent
    component.prioritiesComponent = {
      createForm: () => new FormGroup({}),
    } as any;

    // Executing the create forms
    await component.createForms();

    // Verify the methods were called
    expect(
      component.constraintsPanelComponent.loadExcludedAreas
    ).toHaveBeenCalled();
    expect(component.constraintsPanelComponent.createForm).toHaveBeenCalled();

    // Verify the method has all the controls we need
    expect(component.forms.contains('scenarioName')).toBeTrue();
    expect(component.forms.contains('priorities')).toBeTrue();
    expect(component.forms.contains('constrains')).toBeTrue();
    expect(component.forms.contains('projectAreas')).toBeTrue();
  });

  it('should add validator with existing scenario names', async () => {
    // Mocking existing scenarios
    const mockScenarios = [
      { ...MOCK_SCENARIO, name: 'Scenario 1' },
      { ...MOCK_SCENARIO, name: 'Scenario 2' },
    ];

    // Mock scenarioService
    (component as any).scenarioService = {
      getScenariosForPlan: jasmine
        .createSpy()
        .and.returnValue(new BehaviorSubject(mockScenarios)),
    } as any;

    // Setting planId
    component.planId = 42;

    // Creating form with scenario name control
    component.forms = new FormGroup({
      scenarioName: new FormControl(''),
    });

    await component.setExistingNameValidator();

    // Verify we called getScenariosForPlan with the correct
    expect(
      (component as any).scenarioService.getScenariosForPlan
    ).toHaveBeenCalledWith(42);

    // Check the validator was added
    const control = component.forms.get('scenarioName') as FormControl;
    expect(control.validator).toBeTruthy();

    // Verify it's working
    control.setValue('Scenario 1');
    const error = control.validator!(control);
    expect(error).toEqual({ duplicate: true });

    // Testing with a new name
    control.setValue('New Scenario');
    const valid = control.validator!(control);
    expect(valid).toBeNull();
  });

  it('should set scenario mode with existing scenarioId', () => {
    const mockScenarioId = 1001;
    component.scenarioId = mockScenarioId;

    mockScenario$.next({ ...MOCK_SCENARIO, id: mockScenarioId });
    mockScenarioId$.next(mockScenarioId);

    // Methods
    spyOn(component, 'loadConfig');
    spyOn(component, 'pollForChanges');

    // Initializing values
    component.tabAnimationOptions = { on: 'on', off: 'off' };
    component.isLoading$ = new BehaviorSubject(true);

    component.setScenarioMode();

    // Checking values
    expect(component.scenarioId).toBe(mockScenarioId);
    expect(component.scenarioState).toBe('LOADING');
    expect(component.loadConfig).toHaveBeenCalled();
    expect(component.pollForChanges).toHaveBeenCalled();
    expect(component.selectedTab).toBe(ScenarioTabs.RESULTS);
  });

  it('should enable animation when scenarioId does not exist', () => {
    // Mocking scenario id to be null
    mockScenarioId$.next(null as any);

    // Initializing values
    component.tabAnimationOptions = { on: 'on', off: 'off' };
    component.isLoading$ = new BehaviorSubject(true);

    spyOn(component.isLoading$, 'next');

    component.setScenarioMode();

    expect(component.tabAnimation).toBe('on');
    expect(component.isLoading$.next).toHaveBeenCalledWith(false);
  });

  describe('polling', () => {
    beforeEach(() => {
      spyOn(component, 'loadConfig').and.callThrough();
      mockScenario$.next({
        ...MOCK_SCENARIO,
        id: 1001,
      });
      mockScenarioId$.next(1001);
      component.geoPackageURL = 'http://localhost/someurl';
      component.scenarioImprovementsFeature = true;
    });

    it('should poll for changes if status is pending', fakeAsync(() => {
      setupPollingScenario(component, 'PENDING');

      fixture.detectChanges();
      tick();
      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      tick(POLLING_INTERVAL);
      fixture.detectChanges();

      expect(component.loadConfig).toHaveBeenCalledTimes(2);

      discardPeriodicTasks();
      fixture.destroy();
    }));

    it('should not poll for changes if status is not pending and no geopackage is in progess', fakeAsync(() => {
      setupPollingScenario(component, 'SUCCESS');
      fixture.detectChanges();
      tick();

      expect(component.loadConfig).toHaveBeenCalledTimes(1);
      component.geoPackageURL = 'http://localhost/someurl';

      tick(POLLING_INTERVAL);
      fixture.detectChanges();

      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      discardPeriodicTasks();
      fixture.destroy();
    }));

    it('should poll for geopackage if results are done, but geopackage is pending ', fakeAsync(() => {
      setupPollingScenario(component, 'SUCCESS', 'PENDING');
      fixture.detectChanges();
      tick();

      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      tick(POLLING_INTERVAL);
      fixture.detectChanges();

      expect(component.loadConfig).toHaveBeenCalledTimes(2);

      discardPeriodicTasks();
      fixture.destroy();
    }));

    it('should poll for geopackage if results are done, but geopackage is processing ', fakeAsync(() => {
      setupPollingScenario(component, 'SUCCESS', 'PROCESSING');
      fixture.detectChanges();
      tick();

      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      tick(POLLING_INTERVAL);
      fixture.detectChanges();

      expect(component.loadConfig).toHaveBeenCalledTimes(2);

      discardPeriodicTasks();
      fixture.destroy();
    }));

    it('if results are done and geopackage is SUCCEEDED, there should be no polling, and button should be enabled', fakeAsync(() => {
      setupPollingScenario(component, 'SUCCESS', 'SUCCEEDED');
      fixture.detectChanges();
      tick();

      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      tick(POLLING_INTERVAL);
      fixture.detectChanges();
      component.geoPackageURL = 'someurl';

      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      discardPeriodicTasks();
      fixture.destroy();
    }));
  });

  function setupPollingScenario(
    component: CreateScenariosComponent,
    status: ScenarioResultStatus,
    geoPackageStatus?: GeoPackageStatus
  ) {
    mockPlan$.next({
      ...mockPlan$.value,
    });

    mockScenario$.next({
      ...mockScenario$.value,
      geopackage_status: geoPackageStatus ?? null,
      scenario_result: {
        ...mockScenario$.value.scenario_result!,
        status,
      },
    });
    component.scenarioId = 3001;
  }
});
