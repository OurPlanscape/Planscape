import { TestBed } from '@angular/core/testing';

import { TreatmentGoalsService } from './treatment-goals.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TreatmentGoalsService', () => {
  let service: TreatmentGoalsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(TreatmentGoalsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
