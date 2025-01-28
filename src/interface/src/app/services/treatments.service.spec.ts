import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TreatmentsService } from './treatments.service';
import { TreatmentPlan } from '@types';

describe('TreatmentsService', () => {
  let service: TreatmentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TreatmentsService],
    });
    service = TestBed.inject(TreatmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a treatment plan', () => {
    const dummyResponse: Partial<TreatmentPlan> = { id: 1, name: 'Plan A' };
    const scenarioId = 1;
    const name = 'Plan A';

    service.createTreatmentPlan(scenarioId, name).subscribe((response) => {
      expect(response).toEqual(dummyResponse as TreatmentPlan);
    });

    const req = httpMock.expectOne(service.baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ scenario: scenarioId, name: name });
    expect(req.request.withCredentials).toBeTrue();
    req.flush(dummyResponse);
  });

  it('should list treatment plans', () => {
    const dummyResponse: Partial<TreatmentPlan>[] = [
      { id: 1, name: 'Plan A' },
      { id: 2, name: 'Plan B' },
    ];
    const scenarioId = 1;

    service.listTreatmentPlans(scenarioId).subscribe((response) => {
      expect(response).toEqual(dummyResponse as TreatmentPlan[]);
    });

    const req = httpMock.expectOne(
      `${service.baseUrl}?scenario=${scenarioId}&ordering=-created_at`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(dummyResponse);
  });

  it('should delete a treatment plan', () => {
    const dummyResponse: Partial<TreatmentPlan> = { id: 1, name: 'Plan A' };
    const id = 1;

    service.deleteTreatmentPlan(id).subscribe((response) => {
      expect(response).toEqual(dummyResponse as TreatmentPlan);
    });

    const req = httpMock.expectOne(service.baseUrl + id);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(dummyResponse);
  });

  it('should get a treatment plan', () => {
    const dummyResponse: Partial<TreatmentPlan> = { id: 1, name: 'Plan A' };
    const id = 1;

    service.getTreatmentPlan(id).subscribe((response) => {
      expect(response).toEqual(dummyResponse as TreatmentPlan);
    });

    const req = httpMock.expectOne(service.baseUrl + id);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(dummyResponse);
  });
});
