import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ScenarioService } from '@services/scenario.service';
import { Scenario, ScenarioConfig } from '@types';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { PlanService } from '@services/plan.service';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { FeatureService } from '@app/features/feature.service';

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
        project_areas: [],
        excluded_areas: undefined,
        stand_size: 'MEDIUM',
      };
      const scenario: Scenario = {
        id: 1,
        name: 'name',
        notes: undefined,
        planning_area: 1,
        configuration: scenarioConfig,
        scenario_result: undefined,
        status: 'ACTIVE',
        geopackage_status: null,
        geopackage_url: null,
        type: 'PRESET',
      };

      service.getScenario(1).subscribe((res) => {
        expect(res).toEqual(scenario);
      });
      tick();
      const req = httpTestingController.expectOne(service.v2Path + '1/');
      expect(req.request.method).toEqual('GET');
      req.flush(scenario);
    }));
  });
});
