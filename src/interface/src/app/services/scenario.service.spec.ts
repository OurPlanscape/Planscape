import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ScenarioService } from './scenario.service';
import { Scenario, ScenarioConfig, TreatmentQuestionConfig } from '@types';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { PlanService } from './plan.service';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { FeatureService } from '../features/feature.service';

describe('ScenarioService', () => {
  let service: ScenarioService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: PlanService,
          useValue: {
            treatmentGoalsConfig$: of([
              {
                category_name: 'One',
                questions: [],
              },
            ]),
            updateStateWithScenario: () => {},
          },
        },
        MockProvider(FeatureService),
      ],
    });
    service = TestBed.inject(ScenarioService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // TODO Update once Project/Scenario types are updated
  describe('getScenario', () => {
    it('should make HTTP request to backend', fakeAsync(() => {
      const scenarioConfig: ScenarioConfig = {
        estimated_cost: undefined,
        max_budget: undefined,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_area: undefined,
        treatment_question: null,
        project_areas: [],
        excluded_areas: undefined,
        stand_size: 'MEDIUM',
      };
      const scenario: Scenario = {
        id: '1',
        name: 'name',
        notes: undefined,
        planning_area: 1,
        configuration: scenarioConfig,
        scenario_result: undefined,
        status: 'ACTIVE',
      };

      service.getScenario('1').subscribe((res) => {
        expect(res).toEqual(scenario);
      });
      tick();
      const req = httpTestingController.expectOne(service.v2Path + '1/');
      expect(req.request.method).toEqual('GET');
      req.flush(scenario);
    }));
  });

  describe('createScenario', () => {
    let defaultSelectedQuestion: TreatmentQuestionConfig = {
      short_question_text: '',
      long_question_text: '',
      scenario_output_fields_paths: { metrics: [''] },
      scenario_priorities: [''],
      stand_thresholds: [''],
      global_thresholds: [''],
      weights: [0],
      id: 2,
    };
    it('should make HTTP request to backend', fakeAsync(() => {
      const scenarioConfig: ScenarioConfig = {
        estimated_cost: 1,
        min_distance_from_road: 1,
        max_slope: 1,
        max_area: 1,
        excluded_areas: undefined,
        max_budget: 200,
        treatment_question: defaultSelectedQuestion,
        stand_size: 'LARGE',
      };
      const scenario: Scenario = {
        id: '1',
        name: 'name',
        planning_area: 1,
        configuration: scenarioConfig,
        status: 'ACTIVE',
      };

      const backendConfig = {
        stand_size: 'LARGE',
        estimated_cost: 1,
        max_budget: 200,
        max_area: null,
        max_project_count: undefined,
        max_slope: 1,
        min_distance_from_road: 1,
        excluded_areas: undefined,
        seed: undefined,
      };

      const featureService = TestBed.inject(FeatureService);
      spyOn(featureService, 'isFeatureEnabled').and.returnValue(true);

      service
        .createScenario({
          name: scenario.name,
          planning_area: scenario.planning_area,
          configuration: scenarioConfig,
          treatment_goal: 5,
        })
        .subscribe((res) => {
          expect(res).toEqual(jasmine.objectContaining({ id: '1' }));
        });

      tick();
      const req = httpTestingController.expectOne(service.v2Path);
      expect(req.request.method).toEqual('POST');

      expect(req.request.body).toEqual({
        name: 'name',
        planning_area: 1,
        configuration: backendConfig,
        treatment_goal: 5,
      });

      req.flush({ ...scenario, id: '1' });
      httpTestingController.verify();
    }));
  });
});
