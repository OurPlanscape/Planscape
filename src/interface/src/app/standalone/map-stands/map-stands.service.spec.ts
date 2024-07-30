import { TestBed } from '@angular/core/testing';

import { MapStandsService } from './map-stands.service';

describe('MapStandsService', () => {
  let service: MapStandsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapStandsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
