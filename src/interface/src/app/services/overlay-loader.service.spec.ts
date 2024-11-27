import { TestBed } from '@angular/core/testing';

import { OverlayLoaderService } from './overlay-loader.service';

describe('OverlayLoaderService', () => {
  let service: OverlayLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OverlayLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
