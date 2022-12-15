import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BackendConstants } from '../backend-constants';
import { PlanService } from './plan.service';
import { BasePlan, Plan, Region } from '../types';

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
      ownerId: 'tempUserId',
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
});
