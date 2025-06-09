import { TestBed } from '@angular/core/testing';

import { DrawService } from './draw.service';

describe('DrawService', () => {
  let service: DrawService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [DrawService] });
    service = TestBed.inject(DrawService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
