import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BackendConstants } from '../backend-constants';
import {
  BackendPlan,
  BackendPlanPreview,
  BasePlan,
  Plan,
  Region,
} from '../types';
import { PlanPreview } from './../types/plan.types';
import { PlanService } from './plan.service';
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
        scenarios: 0,
        notes: '',
        configs: 0,
        createdTimestamp: undefined,
        lastUpdated: undefined,
        ownerId: '2',
        area_acres: 123,
        area_m2: 231,
        creator: 'John Doe',
        user: 2,
        role: 'Creator',
        permissions: [],
      };

      const backendPlan: BackendPlan = {
        id: 1,
        name: expectedPlan.name,
        user: 2,
        region_name: expectedPlan.region,
        geometry: expectedPlan.planningArea,
        area_acres: 123,
        area_m2: 231,
        creator: 'John Doe',
        role: 'Creator',
        permissions: [],
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
        creator: 'John',
        area_acres: 123,
        area_m2: 231,
        role: 'Creator',
        permissions: [],
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
        creator: 'John',
        area_acres: 123,
        area_m2: 231,
        role: 'Creator',
        permissions: [],
      };

      service.listPlansByUser().subscribe((res) => {
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
});
