import { TestBed } from '@angular/core/testing';
import { PlanningAreaNotesService } from './notes.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PlanningAreaNotesService', () => {
  let service: PlanningAreaNotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlanningAreaNotesService],
    });
    service = TestBed.inject(PlanningAreaNotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
