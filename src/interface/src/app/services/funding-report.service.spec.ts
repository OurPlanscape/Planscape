import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { FundingReportService } from './funding-report.service';
import { FundingReport } from '@types';

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
});
