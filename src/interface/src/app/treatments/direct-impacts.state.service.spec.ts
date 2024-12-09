import { TestBed } from '@angular/core/testing';

import { DirectImpactsStateService } from './direct-impacts.state.service';

describe('DirectImpactsStateService', () => {
  let service: DirectImpactsStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DirectImpactsStateService],
    });
    service = TestBed.inject(DirectImpactsStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
