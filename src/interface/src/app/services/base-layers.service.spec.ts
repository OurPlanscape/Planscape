import { TestBed } from '@angular/core/testing';

import { BaseLayersService } from './base-layers.service';

describe('BaseLayersService', () => {
  let service: BaseLayersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseLayersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
