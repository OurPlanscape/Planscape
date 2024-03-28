import { TestBed } from '@angular/core/testing';
import { PlanNotesService } from './plan-notes.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PlanNotesService', () => {
  let service: PlanNotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PlanNotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
