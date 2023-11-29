import { TestBed } from '@angular/core/testing';

import { RegionService } from './region.service';
import { FeaturesModule } from '../features/features.module';

describe('RegionService', () => {
  let service: RegionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FeaturesModule] });
    service = TestBed.inject(RegionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
