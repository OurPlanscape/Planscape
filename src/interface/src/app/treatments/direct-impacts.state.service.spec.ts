import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { DirectImpactsStateService } from './direct-impacts.state.service';

describe('DirectImpactsStateService', () => {
  let service: DirectImpactsStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DirectImpactsStateService],
    });
    service = TestBed.inject(DirectImpactsStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
