import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { FundingReportService } from './funding-report.service';
import { FundingReport, FundingReportAETSummary } from '@types';

describe('FundingReportService', () => {
  let service: FundingReportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(FundingReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getReport returns the report on success', () => {
    const report: FundingReport = {
      status: 'SUCCESS',
      created_at: '2026-01-01T00:00:00Z',
      created_by: 1,
      updated_at: '2026-01-01T00:00:00Z',
      id: 1,
      scenario: 123,
      results: null,
      treatment_datalayer: null,
      aet_datalayer: null,
      geopackage_status: null,
      geopackage_url: null,
    };
    let result: FundingReport | null | undefined;
    service.getReport(123).subscribe((r) => (result = r));

    httpMock
      .expectOne((req) => req.url.endsWith('v2/scenarios/123/get-report/'))
      .flush(report);

    expect(result).toEqual(report);
  });

  it('getReport returns null when the report does not exist (404)', () => {
    let result: FundingReport | null | undefined;
    service.getReport(123).subscribe((r) => (result = r));

    httpMock
      .expectOne((req) => req.url.endsWith('v2/scenarios/123/get-report/'))
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(result).toBeNull();
  });

  it('getReport rethrows non-404 errors', () => {
    let errored = false;
    service.getReport(123).subscribe({
      error: () => (errored = true),
    });

    httpMock
      .expectOne((req) => req.url.endsWith('v2/scenarios/123/get-report/'))
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(errored).toBeTrue();
  });

  it('getWaterAvailability POSTs the target percentage and returns the AET summary', () => {
    const summary: FundingReportAETSummary = {
      percentage: 25,
      improved_acres: 50,
      total_project_area_acres: 100,
      improved_area_percent: 50,
    };
    let result: FundingReportAETSummary | undefined;
    service.getWaterAvailability(123, 25).subscribe((r) => (result = r));

    const req = httpMock.expectOne((r) =>
      r.url.endsWith('v2/scenarios/123/aet-improvement/')
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ percentage: 25 });
    expect(req.request.withCredentials).toBeTrue();
    req.flush(summary);

    expect(result).toEqual(summary);
  });
});
