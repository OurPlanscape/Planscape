import { TestBed } from '@angular/core/testing';

import { ShareMapService } from './share-map.service';

describe('ShareMapService', () => {
  let service: ShareMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareMapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
