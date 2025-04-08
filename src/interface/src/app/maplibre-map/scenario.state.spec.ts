import { TestBed } from '@angular/core/testing';
import { ScenarioState } from './scenario.state';
import { ScenarioService } from '@services';
import { Scenario } from '@types';
import { of, throwError } from 'rxjs';

describe('ScenarioState', () => {
  let scenarioState: ScenarioState;
  let scenarioServiceSpy: jasmine.SpyObj<ScenarioService>;

  const mockScenario: Scenario = {
    id: '1',
    name: 'Test Scenario',
    planning_area: 'Area 51',
    configuration: {
      est_cost: 1000,
      max_budget: 5000,
      max_slope: 20,
      max_treatment_area_ratio: 0.5,
      min_distance_from_road: 10,
      stand_size: 'Medium',
      excluded_areas: [],
      project_areas: [],
      treatment_question: null,
      scenario_priorities: [],
      scenario_output_fields: [],
      question_id: 42,
    },
    status: 'ACTIVE',
    user: 1,
    max_treatment_area: 100,
    created_at: '2025-04-01T00:00:00Z',
    max_budget: 5000,
    tx_plan_count: 3,
    origin: 'USER',
    scenario_result: {
      status: 'SUCCESS',
      completed_at: '2025-04-02T12:00:00Z',
      result: {
        type: 'FeatureCollection',
        features: [],
      },
    },
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ScenarioService', ['getScenario']);

    TestBed.configureTestingModule({
      providers: [ScenarioState, { provide: ScenarioService, useValue: spy }],
    });

    scenarioServiceSpy = TestBed.inject(
      ScenarioService
    ) as jasmine.SpyObj<ScenarioService>;
    scenarioState = TestBed.inject(ScenarioState);
  });

  it('should be created', () => {
    expect(scenarioState).toBeTruthy();
  });

  it('should emit loading and then data when getScenario succeeds', (done) => {
    scenarioServiceSpy.getScenario.and.returnValue(of(mockScenario));
    scenarioState.setScenarioId(1);

    const emissions: any[] = [];

    scenarioState.currentScenarioResource$.subscribe((value) => {
      emissions.push(value);

      if (!value.isLoading && value.data) {
        expect(emissions.length).toBe(2);
        expect(emissions[0].isLoading).toBeTrue();
        expect(emissions[1].data).toEqual(mockScenario);
        expect(emissions[1].isLoading).toBeFalse();
        done();
      }
    });
  });

  it('should emit loading and then error when getScenario fails', (done) => {
    const mockError = new Error('API Error');
    scenarioServiceSpy.getScenario.and.returnValue(throwError(() => mockError));
    scenarioState.setScenarioId(1);

    const emissions: any[] = [];

    scenarioState.currentScenarioResource$.subscribe((value) => {
      emissions.push(value);

      if (!value.isLoading && value.error) {
        expect(emissions.length).toBe(2);
        expect(emissions[0].isLoading).toBeTrue();
        expect(emissions[1].isLoading).toBeFalse();
        expect(emissions[1].error).toEqual(mockError);
        done();
      }
    });
  });

  it('should emit scenario data in currentScenario$', (done) => {
    scenarioServiceSpy.getScenario.and.returnValue(of(mockScenario));
    scenarioState.setScenarioId(1);

    scenarioState.currentScenario$.subscribe((scenario) => {
      expect(scenario).toEqual(mockScenario);
      done();
    });
  });

  it('should emit true then false in isScenarioLoading$', (done) => {
    scenarioServiceSpy.getScenario.and.returnValue(of(mockScenario));
    scenarioState.setScenarioId(1);

    const loadingStates: boolean[] = [];

    scenarioState.isScenarioLoading$.subscribe((loading) => {
      loadingStates.push(loading);
      if (loadingStates.length === 2) {
        expect(loadingStates).toEqual([true, false]);
        done();
      }
    });
  });

  it('should allow reloading the scenario manually', (done) => {
    scenarioServiceSpy.getScenario.and.returnValue(of(mockScenario));
    scenarioState.setScenarioId(1);

    let callCount = 0;

    scenarioState.currentScenarioResource$.subscribe((value) => {
      if (!value.isLoading && value.data) {
        callCount++;
        if (callCount === 2) {
          expect(scenarioServiceSpy.getScenario).toHaveBeenCalledTimes(2);
          done();
        }
      }
    });

    setTimeout(() => {
      scenarioState.reloadScenario();
    }, 0);
  });
});
