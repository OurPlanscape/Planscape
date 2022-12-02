import { TestBed } from '@angular/core/testing';

import { PlanService } from './plan.service';
import { BasePlan, Plan, Region } from '../types';

describe('PlanService', () => {
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
    }
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanService);
  });

  describe('createPlan', () => {
    it('should update state when response is a success', () => {
      const expectedPlan: Plan = {
        ...mockPlan,
        id: '1',
      }
      service.createPlan(mockPlan).subscribe(res => {
        expect(res).toEqual({success: true, result: expectedPlan});
      });

      expect(service.planState$.value.all).toEqual({[expectedPlan.id]: expectedPlan});
    });
  });

});
