import { TestBed } from '@angular/core/testing';

import { TreatmentsService } from './treatments.service';

describe('TreatmentsService', () => {
  let service: TreatmentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TreatmentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
