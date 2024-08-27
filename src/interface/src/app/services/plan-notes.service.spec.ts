import { TestBed } from '@angular/core/testing';
import { NotesService } from './plan-notes.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('NotesService', () => {
  let service: NotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(NotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
