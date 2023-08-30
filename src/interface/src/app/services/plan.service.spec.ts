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
  PlanConditionScores,
  PlanPreview,
  ProjectConfig,
  Scenario,
  TreatmentGoalConfig,
} from './../types/plan.types';
import { BackendPlan, PlanService } from './plan.service';
import { MapService } from './map.service';

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
      BackendConstants.END_POINT + '/plan/treatment_goals_config/?region_name=sierra-nevada'
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

  describe('createPlan', () => {
    it('should update state when response is a success', () => {
      const expectedPlan: Plan = {
        ...mockPlan,
        id: '1',
        savedScenarios: 0,
      };
      service.createPlan(mockPlan).subscribe((res) => {
        expect(res).toEqual({ success: true, result: expectedPlan });
      });
      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT + '/plan/create/'
      );
      expect(req.request.method).toEqual('POST');
      req.flush(1);
      httpTestingController.verify();

      expect(service.planState$.value.all).toEqual({
        [expectedPlan.id]: expectedPlan,
      });
    });
  });

  describe('deletePlan', () => {
    it('should make HTTP post request to DB for a single ID', () => {
      service.deletePlan(['1']).subscribe((res) => {
        expect(res).toEqual('1');
      });
      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/delete/?id=1')
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
        BackendConstants.END_POINT.concat('/plan/delete/?id=1,2,3')
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
        owner: 2,
        region_name: expectedPlan.region,
        geometry: expectedPlan.planningArea,
      };

      service.getPlan('1').subscribe((res) => {
        expect(res).toEqual(expectedPlan);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/get_plan/?id=1')
      );
      req.flush(backendPlan);
      httpTestingController.verify();
    });
  });

  describe('listPlansByUser', () => {
    it('should make HTTP get request to DB', () => {
      const expectedPlan: PlanPreview = {
        id: '1',
        name: mockPlan.name,
        region: mockPlan.region,
        savedScenarios: 1,
        configurations: 2,
        createdTimestamp: 5000,
      };

      const backendPlan: BackendPlan = {
        id: 1,
        name: expectedPlan.name,
        owner: 2,
        region_name: mockPlan.region,
        geometry: mockPlan.planningArea,
        scenarios: 1,
        projects: 2,
        creation_timestamp: 5,
      };

      service.listPlansByUser(null).subscribe((res) => {
        expect(res).toEqual([expectedPlan]);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/list_plans_by_owner')
      );
      req.flush([backendPlan]);
      httpTestingController.verify();
    });
  });

  describe('getConditionScoresForPlanningArea', () => {
    it('should make HTTP request to backend', () => {
      const expectedScores: PlanConditionScores = {
        conditions: [
          {
            condition: 'fake_condition',
            mean_score: 1.3,
          },
        ],
      };

      service.getConditionScoresForPlanningArea('1').subscribe((res) => {
        expect(res).toEqual(expectedScores);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/scores/?id=1')
      );
      req.flush(expectedScores);
      httpTestingController.verify();
    });
  });

  describe('createProjectInPlan', () => {
    it('should make HTTP request to backend', () => {
      service.createProjectInPlan('1').subscribe((res) => {
        expect(res).toEqual(1);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/create_project/')
      );
      expect(req.request.body).toEqual({ plan_id: 1 });
      expect(req.request.method).toEqual('POST');
      req.flush(1);
      httpTestingController.verify();
    });
  });

  describe('createProjectArea', () => {
    it('should make HTTP request to backend', () => {
      service.createProjectArea(1, fakeGeoJson).subscribe((res) => {
        expect(res).toEqual(1);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/create_project_area/')
      );
      expect(req.request.body).toEqual({
        project_id: 1,
        geometry: fakeGeoJson,
      });
      expect(req.request.method).toEqual('POST');
      req.flush(1);
      httpTestingController.verify();
    });
  });

  describe('bulkCreateProjectAreas', () => {
    it('should make HTTP request to backend', () => {
      service.bulkCreateProjectAreas(1, [fakeGeoJson]).subscribe((res) => {
        expect(res).toEqual(null);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/plan/create_project_areas_for_project/'
        )
      );
      expect(req.request.body).toEqual({
        project_id: 1,
        geometries: [fakeGeoJson],
      });
      expect(req.request.method).toEqual('POST');
      req.flush(1);
      httpTestingController.verify();
    });
  });

  describe('updateProject', () => {
    it('should make HTTP request to backend', () => {
      const projectConfig: ProjectConfig = {
        id: 1,
        max_budget: 200,
      };

      service.updateProject(projectConfig).subscribe((res) => {
        expect(res).toEqual(1);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/update_project/')
      );
      expect(req.request.body).toEqual(projectConfig);
      expect(req.request.method).toEqual('PUT');
      req.flush(1);
      httpTestingController.verify();
    });
  });

  describe('getProjectsForPlan', () => {
    it('should make HTTP request to backend', () => {
      const projectConfigs: ProjectConfig[] = [
        {
          id: 1,
          planId: undefined,
          est_cost: undefined,
          max_budget: 200,
          min_distance_from_road: undefined,
          max_slope: undefined,
          max_treatment_area_ratio: undefined,
          priorities: undefined,
          createdTimestamp: undefined,
          weights: undefined,
        },
      ];

      service.getProjectsForPlan('1').subscribe((res) => {
        expect(res).toEqual(projectConfigs);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/plan/list_projects_for_plan/?plan_id=1'
        )
      );
      expect(req.request.method).toEqual('GET');
      req.flush([
        {
          id: 1,
          max_budget: 200,
        },
      ]);
      httpTestingController.verify();
    });
  });

  describe('getProject', () => {
    it('should make HTTP request to backend', () => {
      const projectConfig: ProjectConfig = {
        id: 1,
        planId: undefined,
        est_cost: undefined,
        max_budget: 200,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_treatment_area_ratio: undefined,
        priorities: undefined,
        createdTimestamp: undefined,
        weights: undefined,
      };

      service.getProject(1).subscribe((res) => {
        expect(res).toEqual(projectConfig);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/get_project/?id=1')
      );
      expect(req.request.method).toEqual('GET');
      req.flush(projectConfig);
      httpTestingController.verify();
    });
  });

  describe('deleteProjects', () => {
    it('should make HTTP request to backend', () => {
      const projectIds = [1, 2];

      service.deleteProjects(projectIds).subscribe((res) => {
        expect(res).toEqual(projectIds);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/delete_projects/')
      );
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({
        project_ids: projectIds,
      });
      req.flush(projectIds);
      httpTestingController.verify();
    });
  });

  describe('getScenario', () => {
    it('should make HTTP request to backend', () => {
      const projectConfig: ProjectConfig = {
        id: 1,
        planId: undefined,
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
        planId: undefined,
        projectId: undefined,
        config: projectConfig,
        priorities: [],
        projectAreas: [],
        createdTimestamp: undefined,
        notes: undefined,
        owner: undefined,
        favorited: undefined,
      };

      service.getScenario('1').subscribe((res) => {
        expect(res).toEqual(scenario);
      });
      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/get_scenario/?id=1')
      );
      expect(req.request.method).toEqual('GET');
      req.flush(scenario);
    });
  });

  describe('createScenario', () => {
    it('should make HTTP request to backend', (done) => {
      const projectConfig: ProjectConfig = {
        id: 1,
        planId: 2,
        max_budget: 200,
      };

      service.createScenario(projectConfig).subscribe((res) => {
        expect(res).toEqual('1');
        done();
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/create_scenario/')
      );
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({
        project_id: 1,
        plan_id: 2,
        est_cost: undefined,
        max_budget: 200,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_treatment_area_ratio: undefined,
        priorities: undefined,
        weights: undefined,
      });
      req.flush('1');
      httpTestingController.verify();
    });
  });

  describe('getScenariosForPlan', () => {
    it('should make HTTP request to backend', (done) => {
      const projectConfig: ProjectConfig = {
        id: 1,
        planId: undefined,
        est_cost: undefined,
        max_budget: 200,
        min_distance_from_road: undefined,
        max_slope: undefined,
        max_treatment_area_ratio: undefined,
        priorities: undefined,
        createdTimestamp: undefined,
        weights: undefined,
      };
      service.getScenariosForPlan('1').subscribe((res) => {
        expect(res).toEqual([
          {
            id: '1',
            createdTimestamp: 5000,
            planId: undefined,
            projectId: undefined,
            config: projectConfig,
            priorities: [],
            projectAreas: [],
            notes: undefined,
            owner: undefined,
            favorited: undefined,
          },
        ]);
        done();
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/plan/list_scenarios_for_plan/?plan_id=1'
        )
      );
      expect(req.request.method).toEqual('GET');
      req.flush([
        {
          id: '1',
          creation_timestamp: 5,
          config: projectConfig,
        },
      ]);
      httpTestingController.verify();
    });
  });

  describe('updateScenarioNotes', () => {
    it('should make HTTP request to backend', () => {
      const projectConfig: ProjectConfig = {
        id: 1,
        planId: undefined,
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
        planId: undefined,
        projectId: undefined,
        config: projectConfig,
        priorities: [],
        projectAreas: [],
        createdTimestamp: undefined,
        notes: 'hello',
        owner: undefined,
        favorited: undefined,
      };

      service.updateScenarioNotes(scenario).subscribe((res) => {
        expect(res).toEqual(1);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/plan/update_scenario/')
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
        BackendConstants.END_POINT.concat('/plan/delete_scenarios/')
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
