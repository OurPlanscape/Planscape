import { TestBed } from '@angular/core/testing';
import { ModelNotesService } from './plan-notes.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ModelNotesService', () => {
  let service: ModelNotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ModelNotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
