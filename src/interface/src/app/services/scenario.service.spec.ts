import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ScenarioService } from './scenario.service';
import { Scenario, ScenarioConfig, TreatmentQuestionConfig } from '@types';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { PlanService } from './plan.service';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

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
        est_cost: undefined,
        max_budget: undefined,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_treatment_area_ratio: undefined,
        treatment_question: null,
        project_areas: [],
        excluded_areas: undefined,
        stand_size: 'MEDIUM',
      };
      const scenario: Scenario = {
        id: '1',
        name: 'name',
        notes: undefined,
        planning_area: '1',
        configuration: scenarioConfig,
        scenario_result: undefined,
        status: 'ACTIVE',
      };

      service.getScenario('1').subscribe((res) => {
        expect(res).toEqual(scenario);
      });
      tick();
      const req = httpTestingController.expectOne(
        environment.backend_endpoint.concat(
          '/planning/get_scenario_by_id/?id=1'
        )
      );
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
        est_cost: 1,
        min_distance_from_road: 1,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        excluded_areas: undefined,
        max_budget: 200,
        treatment_question: defaultSelectedQuestion,
        stand_size: 'LARGE',
      };
      const scenario: Scenario = {
        name: 'name',
        planning_area: '1',
        configuration: scenarioConfig,
        status: 'ACTIVE',
      };

      const backendConfig = {
        est_cost: 1,
        min_distance_from_road: 1,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        excluded_areas: undefined,
        max_budget: 200,
        scenario_output_fields: [''],
        scenario_priorities: [''],
        stand_thresholds: [''],
        global_thresholds: [''],
        weights: [0],
        stand_size: 'LARGE',
        question_id: 2,
      };

      service.createScenario(scenario).subscribe((res) => {
        expect(res).toEqual('1');
      });

      tick();
      const req = httpTestingController.expectOne(
        environment.backend_endpoint.concat('/planning/create_scenario/')
      );
      expect(req.request.method).toEqual('POST');

      expect(req.request.body).toEqual({
        name: 'name',
        planning_area: '1',
        configuration: backendConfig,
        status: 'ACTIVE',
      });
      req.flush('1');

      httpTestingController.verify();
    }));
  });

  describe('updateScenarioNotes', () => {
    it('should make HTTP request to backend', () => {
      const scenarioConfig: ScenarioConfig = {
        est_cost: undefined,
        max_budget: undefined,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_treatment_area_ratio: undefined,
        treatment_question: undefined,
      };
      const scenario: Scenario = {
        id: '1',
        name: 'name',
        planning_area: '1',
        configuration: scenarioConfig,
        notes: 'hello',
        status: 'ACTIVE',
      };

      service.updateScenarioNotes(scenario).subscribe((res) => {
        expect(res).toEqual(1);
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint.concat('/planning/update_scenario/')
      );
      expect(req.request.body).toEqual({
        id: scenario.id,
        notes: scenario.notes,
      });
      expect(req.request.method).toEqual('PATCH');
      req.flush(1);
      httpTestingController.verify();
    });
  });

  describe('deleteScenarios', () => {
    it('should make HTTP request to backend', (done) => {
      service.deleteScenarios(['1']).subscribe((res) => {
        expect(res).toEqual(['1']);
        done();
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint.concat('/planning/delete_scenario/')
      );
      expect(req.request.method).toEqual('POST');
      req.flush(['1']);
      httpTestingController.verify();
    });
  });
});
