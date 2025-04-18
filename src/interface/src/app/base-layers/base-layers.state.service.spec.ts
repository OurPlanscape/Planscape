import { TestBed } from '@angular/core/testing';

import { BaseLayersStateService } from './base-layers.state.service';

describe('BaseLayersStateService', () => {
  let service: BaseLayersStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseLayersStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
