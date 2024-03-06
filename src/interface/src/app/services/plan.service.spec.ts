import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BackendConstants } from '../backend-constants';
import { ActualPlan } from '../types';
import { PlanService } from './plan.service';
import { MapService } from './map.service';
import { MOCK_PLAN } from './mocks';

// TODO Make test for getting scenario results
// TODO Make test for call to create project area
// TODO Make test for call to bulk create project area
// TODO 'createPlan' => it('should update state when response is a success' test once ProjectConfig Interface is replaced

describe('PlanService', () => {
  let httpTestingController: HttpTestingController;
  let service: PlanService;
  let mockPlan: ActualPlan;

  beforeEach(() => {
    mockPlan = MOCK_PLAN;
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
      service.getPlan('1').subscribe((res) => {
        expect(res).toEqual(mockPlan);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/planning/get_planning_area_by_id/?id=1'
        )
      );
      req.flush(mockPlan);
      httpTestingController.verify();
    });
  });

  describe('listPlansByUser', () => {
    it('should make HTTP get request to DB', () => {
      service.listPlansByUser().subscribe((res) => {
        expect(res).toEqual([mockPlan]);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat('/planning/list_planning_areas')
      );
      req.flush([mockPlan]);
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
