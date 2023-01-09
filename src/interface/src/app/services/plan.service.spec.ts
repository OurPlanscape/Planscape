import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BackendConstants } from '../backend-constants';
import { BasePlan, Plan, Region } from '../types';
import { PlanPreview } from './../types/plan.types';
import { BackendPlan, PlanService } from './plan.service';

describe('PlanService', () => {
  let httpTestingController: HttpTestingController;
  let service: PlanService;
  let mockPlan: BasePlan;

  beforeEach(() => {
    const fakeGeoJson: GeoJSON.GeoJSON = {
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
      providers: [PlanService],
    });
    service = TestBed.inject(PlanService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  describe('createPlan', () => {
    it('should update state when response is a success', () => {
      const expectedPlan: Plan = {
        ...mockPlan,
        id: '1',
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
        createdTimestamp: 5000,
      };

      const backendPlan: BackendPlan = {
        id: 1,
        name: expectedPlan.name,
        owner: 2,
        region_name: mockPlan.region,
        geometry: mockPlan.planningArea,
        scenarios: 1,
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
});
