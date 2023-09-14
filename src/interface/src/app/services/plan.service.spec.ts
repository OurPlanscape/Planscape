import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BackendConstants } from '../backend-constants';
import {
  BasePlan,
  Plan,
  Region,
  BoundaryConfig,
  ConditionsConfig,
} from '../types';
import {
  PlanPreview,
  ProjectConfig,
  Scenario,
  ScenarioConfig,
  TreatmentGoalConfig,
} from './../types/plan.types';
import { BackendPlan, BackendPlanPreview, PlanService } from './plan.service';
import { MapService } from './map.service';
// TODO Make test for getting scenario results
// TODO Make test for call to create project area
// TODO Make test for call to bulk create project area
// TODO 'createPlan' => it('should update state when response is a success' test once ProjectConfig Interface is replaced

describe('PlanService', () => {
  let httpTestingController: HttpTestingController;
  let service: PlanService;
  let mockPlan: BasePlan;
  let fakeGeoJson: GeoJSON.GeoJSON;

  const treatmentGoalConfigs: TreatmentGoalConfig[] = [];

  const boundaryConfigs: BoundaryConfig[] = [];

  const conditionsConfig: ConditionsConfig = {
    pillars: [
      {
        pillar_name: 'pillar',
        display_name: 'pillar_display',
      },
    ],
  };
  beforeEach(() => {
    fakeGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
    mockPlan = {
      name: 'tempName',
      ownerId: '2',
      region: Region.SIERRA_NEVADA,
      planningArea: fakeGeoJson,
    };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlanService, MapService],
    });
    service = TestBed.inject(PlanService);
    httpTestingController = TestBed.inject(HttpTestingController);
    // Must flush the requests in the constructor for httpTestingController.verify()
    // to pass in other tests.
    const req1 = httpTestingController.expectOne(
      BackendConstants.END_POINT +
        '/planning/treatment_goals_config/?region_name=sierra-nevada'
    );
    req1.flush(treatmentGoalConfigs);
    const req2 = httpTestingController.expectOne(
      BackendConstants.END_POINT + '/boundary/config/?region_name=sierra-nevada'
    );
    req2.flush(boundaryConfigs);
    const req3 = httpTestingController.expectOne(
      BackendConstants.END_POINT +
        '/conditions/config/?region_name=sierra-nevada'
    );
    req3.flush(conditionsConfig);
  });

  describe('deletePlan', () => {
    it('should make HTTP post request to DB for a single ID', () => {
      service.deletePlan(['1']).subscribe((res) => {
        expect(res).toEqual('1');
      });
      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/planning/delete_planning_area/?id=1'
        )
      );

      expect(req.request.method).toEqual('POST');
      expect(req.request.body['id']).toEqual(['1']);

      req.flush('1');
      httpTestingController.verify();
    });

    it('should make HTTP post request to DB for multiple IDs', () => {
      service.deletePlan(['1', '2', '3']).subscribe((res) => {
        expect(res).toEqual('[1,2,3]');
      });
      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/planning/delete_planning_area/?id=1,2,3'
        )
      );

      expect(req.request.method).toEqual('POST');
      expect(req.request.body['id']).toEqual(['1', '2', '3']);

      req.flush('[1,2,3]');
      httpTestingController.verify();
    });
  });

  describe('getPlan', () => {
    it('should make HTTP get request to DB', () => {
      const expectedPlan: Plan = {
        ...mockPlan,
        id: '1',
        savedScenarios: 0,
        configs: 0,
        createdTimestamp: undefined,
      };

      const backendPlan: BackendPlan = {
        id: 1,
        name: expectedPlan.name,
        user: 2,
        region_name: expectedPlan.region,
        geometry: expectedPlan.planningArea,
      };

      service.getPlan('1').subscribe((res) => {
        expect(res).toEqual(expectedPlan);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/planning/get_planning_area_by_id/?id=1'
        )
      );
      req.flush(backendPlan);
      httpTestingController.verify();
    });
  });

  describe('listPlansByUser', () => {
    it('should make HTTP get request to DB', () => {
      const date = '2023-09-11T14:01:31.360004Z';

      const expectedPlan: PlanPreview = {
        id: 1,
        name: mockPlan.name,
        region: mockPlan.region,
        notes: '',
        ownerId: 2,
        scenarios: 1,
        lastUpdated: new Date(date),
        geometry: mockPlan.planningArea,
      };

      const backendPlan: BackendPlanPreview = {
        id: 1,
        name: expectedPlan.name,
        user: 2,
        region_name: mockPlan.region,
        geometry: mockPlan.planningArea,
        scenario_count: 1,
        latest_updated: date,
        notes: '',
      };

      service.listPlansByUser(null).subscribe((res) => {
        expect(res).toEqual([expectedPlan]);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/planning/list_planning_areas')
      );
      req.flush([backendPlan]);
      httpTestingController.verify();
    });
  });

  // TODO Update once Project/Scenario types are updated
  describe('getScenario', () => {
    it('should make HTTP request to backend', () => {
      const scenarioConfig: ScenarioConfig = {
        est_cost: undefined,
        max_budget: undefined,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_treatment_area_ratio: undefined,
        priorities: undefined,
        createdTimestamp: undefined,
        projectAreas: [],
        excluded_areas: undefined,
        weights: undefined,
      };
      const scenario: Scenario = {
        id: '1',
        name: 'name',
        notes: undefined,
        planning_area: '1',
        configuration: scenarioConfig,
      };

      service.getScenario('1').subscribe((res) => {
        expect(res).toEqual(scenario);
      });
      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/planning/get_scenario_by_id/?id=1')
      );
      expect(req.request.method).toEqual('GET');
      req.flush(scenario);
    });
  });

  describe('createScenario', () => {
    it('should make HTTP request to backend', (done) => {
      const scenarioConfig: ScenarioConfig = {
        est_cost: 1,
        min_distance_from_road: 1,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        priorities: ['priority'],
        excluded_areas:undefined,
        weights: [1],
        max_budget: 200,
      };
      const scenario: Scenario = {
        name: 'name',
        planning_area: '1',
        configuration: scenarioConfig,
      };

      service.createScenario(scenario).subscribe((res) => {
        expect(res).toEqual('1');
        done();
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/planning/create_scenario/')
      );
      expect(req.request.method).toEqual('POST');

      expect(req.request.body).toEqual({
        name: 'name',
        planning_area: '1',
        configuration: scenarioConfig
      });
      req.flush('1');
      httpTestingController.verify();
    });
  });

  // TODO Update once Project/Scenario types are updated
  // describe('getScenariosForPlan', () => {
  //   it('should make HTTP request to backend', (done) => {
  //     const projectConfig: ProjectConfig = {
  //       id: 1,
  //       est_cost: 200,
  //       max_budget: 200,
  //       min_distance_from_road: undefined,
  //       max_slope: undefined,
  //       max_treatment_area_ratio: undefined,
  //       priorities: undefined,
  //       createdTimestamp: undefined,
  //       weights: undefined,
  //     };
  //     service.getScenariosForPlan('1').subscribe((res) => {
  //       expect(res).toEqual([
  //         {
  //           id: '1',
  //           createdTimestamp: 5000,
  //           name: 'name',
  //           plan_id: undefined,
  //           projectId: undefined,
  //           config: projectConfig,
  //           priorities: [],
  //           projectAreas: [],
  //           notes: undefined,
  //           owner: undefined,
  //           favorited: undefined,
  //         },
  //       ]);
  //       done();
  //     });

  //     const req = httpTestingController.expectOne(
  //       BackendConstants.END_POINT.concat(
  //         '/planning/list_scenarios_for_planning_area/?planning_area=1'
  //       )
  //     );
  //     expect(req.request.method).toEqual('GET');
  //     req.flush([
  //       {
  //         id: '1',
  //         creation_timestamp: 5,
  //         config: projectConfig,
  //       },
  //     ]);
  //     httpTestingController.verify();
  //   });
  // });

  describe('updateScenarioNotes', () => {
    it('should make HTTP request to backend', () => {
      const scenarioConfig: ScenarioConfig = {
        est_cost: undefined,
        max_budget: undefined,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_treatment_area_ratio: undefined,
        priorities: undefined,
        createdTimestamp: undefined,
        weights: undefined,
      };
      const scenario: Scenario = {
        id: '1',
        name: 'name',
        planning_area: '1',
        configuration: scenarioConfig,
        notes: 'hello',
      };

      service.updateScenarioNotes(scenario).subscribe((res) => {
        expect(res).toEqual(1);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/planning/update_scenario/')
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
        BackendConstants.END_POINT.concat('/planning/delete_scenario/')
      );
      expect(req.request.method).toEqual('POST');
      req.flush(['1']);
      httpTestingController.verify();
    });
  });

  describe('favoriteScenario', () => {
    it('should make HTTP request to backend', (done) => {
      service.favoriteScenario('1').subscribe((res) => {
        expect(res).toEqual({ favorited: true });
        done();
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/favorite_scenario/')
      );
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({ scenario_id: 1 });
      req.flush({ favorited: true });
      httpTestingController.verify();
    });
  });

  describe('unfavoriteScenario', () => {
    it('should make HTTP request to backend', (done) => {
      service.unfavoriteScenario('1').subscribe((res) => {
        expect(res).toEqual({ favorited: false });
        done();
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/unfavorite_scenario/')
      );
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({ scenario_id: 1 });
      req.flush({ favorited: false });
      httpTestingController.verify();
    });
  });
});
