import { TestBed } from '@angular/core/testing';

import { MapModuleService } from './map-module.service';

describe('MapModuleService', () => {
  let service: MapModuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapModuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
