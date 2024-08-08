import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Plan } from '@types';
import { PlanService } from './plan.service';
import { MapService } from './map.service';
import { MOCK_FEATURE_COLLECTION, MOCK_PLAN } from './mocks';
import { environment } from '../../environments/environment';

describe('PlanService', () => {
  let httpTestingController: HttpTestingController;
  let service: PlanService;
  let mockPlan: Plan;

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
      service.deletePlan(1).subscribe(() => {});
      const req = httpTestingController.expectOne(service.v2basePath + '1');

      expect(req.request.method).toEqual('DELETE');

      req.flush('1');
      httpTestingController.verify();
    });
  });

  describe('getPlan', () => {
    it('should make HTTP get request to DB', () => {
      service.getPlan('1').subscribe((res) => {
        expect(res).toEqual(mockPlan);
      });

      const req = httpTestingController.expectOne(service.v2basePath + '1');
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
        environment.backend_endpoint.concat('/planning/list_planning_areas')
      );
      req.flush([mockPlan]);
      httpTestingController.verify();
    });
  });

  describe('getTotalArea', () => {
    it('should call the endpoint with parameters', () => {
      service.getTotalArea(MOCK_FEATURE_COLLECTION).subscribe((res) => {
        expect(res).toEqual(1000);
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint.concat('/planning/validate_planning_area/')
      );
      req.flush({ area_acres: 1000 });

      expect(req.request.body).toEqual({ geometry: MOCK_FEATURE_COLLECTION });
      httpTestingController.verify();
    });
  });
});
