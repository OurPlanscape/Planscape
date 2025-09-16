import { TestBed } from '@angular/core/testing';

import { ForsysService } from './forsys.service';

describe('ForsysService', () => {
  let service: ForsysService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ForsysService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
