import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MockProvider } from 'ng-mocks';
import { of, Subscription } from 'rxjs';

import { DataLayersService, ScenarioService } from '@services';
import { ForsysService } from '@services/forsys.service';
import {
  AvailableStands,
  BaseLayer,
  Constraint,
  ScenarioDraftConfiguration,
} from '@types';
import {
  CUSTOM_SCENARIO_OVERVIEW_STEPS,
  SCENARIO_OVERVIEW_STEPS,
  SUB_UNITS_STEP,
  ScenarioStepConfig,
} from '@scenario/scenario.constants';
import { NewScenarioState } from './new-scenario.state';

const SCENARIO_ID = 42;
const STAND_SIZE = 'LARGE';
const EXCLUDED_AREAS = [11, 12];
const INCLUDED_AREAS = [21, 22];
const SUB_UNIT_LAYER = { id: 31 } as BaseLayer;
const CONSTRAINTS = [
  { datalayer: 41, operator: 'lt', value: '5' },
] as Constraint[];

/**
 * What a step asks the backend for. `null` means the step does not refresh the
 * available stands at all, so no request leaves for it.
 */
interface ExpectedRequest {
  excludes: boolean;
  constraints: boolean;
  subUnit: boolean;
  includes: boolean;
}

const OVERVIEW_REQUESTS: (ExpectedRequest | null)[] = [
  null, // Treatment Goal
  { excludes: false, constraints: false, subUnit: false, includes: false }, // Include Areas
  { excludes: true, constraints: false, subUnit: false, includes: true }, // Exclude Areas
  { excludes: true, constraints: true, subUnit: false, includes: true }, // Stand-level Constraints
  null, // Treatment Target
  null, // Generate Output
];

const CUSTOM_REQUESTS: (ExpectedRequest | null)[] = [
  { excludes: false, constraints: false, subUnit: false, includes: false }, // Priority Objectives
  { excludes: false, constraints: false, subUnit: false, includes: false }, // Co-Benefits
  { excludes: false, constraints: false, subUnit: false, includes: false }, // Include Areas
  { excludes: true, constraints: false, subUnit: false, includes: true }, // Exclude Areas
  { excludes: true, constraints: true, subUnit: false, includes: true }, // Stand-level Constraints
  null, // Treatment Target
  null, // Generate Output
];

const SUB_UNITS_REQUEST: ExpectedRequest = {
  excludes: false,
  constraints: false,
  subUnit: true,
  includes: false,
};

describe('NewScenarioState', () => {
  let state: NewScenarioState;
  let scenarioService: jasmine.SpyObj<ScenarioService>;
  let subscription: Subscription;

  beforeEach(() => {
    scenarioService = jasmine.createSpyObj<ScenarioService>('ScenarioService', [
      'getExcludedStands',
    ]);
    scenarioService.getExcludedStands.and.returnValue(
      of({ summary: { treatable_area: 10 } } as AvailableStands)
    );

    TestBed.configureTestingModule({
      providers: [
        NewScenarioState,
        { provide: ScenarioService, useValue: scenarioService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { scenarioId: SCENARIO_ID } } },
        },
        MockProvider(Router),
        MockProvider(MatSnackBar),
        MockProvider(DataLayersService),
        MockProvider(ForsysService, {
          forsysData$: of({
            thresholds: {
              slope: { id: 1 },
              distance_from_roads: { id: 2 },
            },
          }) as any,
        }),
      ],
    });

    state = TestBed.inject(NewScenarioState);
    state.setScenarioConfig({
      stand_size: STAND_SIZE,
    } as Partial<ScenarioDraftConfiguration>);
    state.setExcludedAreas(EXCLUDED_AREAS);
    state.setIncludedAreas(INCLUDED_AREAS);
    state.setConstraints(CONSTRAINTS);
    state.setSelectedSubUnitLayer(SUB_UNIT_LAYER);
    state.setBaseStandsLoaded(true);

    subscription = state.availableStands$.subscribe();
    scenarioService.getExcludedStands.calls.reset();
  });

  afterEach(() => subscription.unsubscribe());

  function lastRequest() {
    return scenarioService.getExcludedStands.calls.mostRecent()?.args;
  }

  /**
   * Locks down what every step of the workflow sends to the available stands
   * endpoint, so the step flags can be reshuffled without changing behaviour.
   */
  function expectRequestFor(
    step: ScenarioStepConfig,
    expected: ExpectedRequest | null
  ) {
    scenarioService.getExcludedStands.calls.reset();

    state.setCurrentStep(step);

    if (expected === null) {
      expect(scenarioService.getExcludedStands).not.toHaveBeenCalled();
      return;
    }

    expect(lastRequest()).toEqual([
      SCENARIO_ID,
      STAND_SIZE,
      expected.excludes ? EXCLUDED_AREAS : undefined,
      expected.constraints ? CONSTRAINTS : undefined,
      expected.subUnit ? SUB_UNIT_LAYER.id : undefined,
      expected.includes ? INCLUDED_AREAS : undefined,
    ]);
  }

  describe('available stands per step', () => {
    SCENARIO_OVERVIEW_STEPS.forEach((step, index) => {
      it(`asks for the stands of '${step.label}'`, () => {
        expectRequestFor(step, OVERVIEW_REQUESTS[index]);
      });
    });

    CUSTOM_SCENARIO_OVERVIEW_STEPS.forEach((step, index) => {
      it(`asks for the stands of '${step.label}' in a custom scenario`, () => {
        expectRequestFor(step, CUSTOM_REQUESTS[index]);
      });
    });

    it(`asks for the stands of '${SUB_UNITS_STEP.label}'`, () => {
      expectRequestFor(SUB_UNITS_STEP, SUB_UNITS_REQUEST);
    });

    it('asks for nothing before the workflow starts', () => {
      expectRequestFor(null as unknown as ScenarioStepConfig, null);
    });
  });

  describe('repeated requests', () => {
    it('does not ask again when an input the step ignores changes', () => {
      state.setCurrentStep(SCENARIO_OVERVIEW_STEPS[1]); // Include Areas
      scenarioService.getExcludedStands.calls.reset();

      state.setIncludedAreas([23]);
      state.setIncludedAreas([]);

      expect(scenarioService.getExcludedStands).not.toHaveBeenCalled();
    });

    it('asks again when an input the step sends changes', () => {
      state.setCurrentStep(SCENARIO_OVERVIEW_STEPS[2]); // Exclude Areas
      scenarioService.getExcludedStands.calls.reset();

      state.setIncludedAreas([23]);

      expect(scenarioService.getExcludedStands).toHaveBeenCalledTimes(1);
    });
  });
});
