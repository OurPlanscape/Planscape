import { TestBed } from '@angular/core/testing';

import { RasterLayerService } from './raster-layer.service';

describe('RasterLayerService', () => {
  let service: RasterLayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RasterLayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
