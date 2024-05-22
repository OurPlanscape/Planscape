import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { MetricsService } from './metrics.service';
import { MetricConfig, Region, regionToString } from '@types';
import { environment } from '../../environments/environment';

describe('MetricsService', () => {
  let service: MetricsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MetricsService],
    });

    service = TestBed.inject(MetricsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return cached conditions if they exist', () => {
    const mockConditions: MetricConfig[] = [];
    service.conditions[Region.CENTRAL_COAST] = mockConditions;

    service
      .getMetricsForRegion(Region.CENTRAL_COAST)
      .subscribe((conditions) => {
        expect(conditions).toEqual(mockConditions);
      });

    // Ensure no HTTP requests are made
    httpMock.expectNone(
      environment.backend_endpoint +
        '/conditions/config/?flat=true&region_name=' +
        regionToString(Region.CENTRAL_COAST)
    );
  });

  it('should fetch conditions from the backend if not cached', () => {
    const mockConditions: MetricConfig[] = [];
    service.conditions[Region.CENTRAL_COAST] = null;

    service
      .getMetricsForRegion(Region.CENTRAL_COAST)
      .subscribe((conditions) => {
        expect(conditions).toEqual(mockConditions);
        expect(service.conditions[Region.CENTRAL_COAST]).toEqual(
          mockConditions
        );
      });

    const req = httpMock.expectOne(
      environment.backend_endpoint +
        '/conditions/config/?flat=true&region_name=' +
        regionToString(Region.CENTRAL_COAST)
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockConditions);
  });
});
