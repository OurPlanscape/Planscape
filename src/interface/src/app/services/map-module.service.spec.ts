import { TestBed } from '@angular/core/testing';

import { MapModuleService } from './map-module.service';
import { MockProvider } from 'ng-mocks';
import { ModuleService } from './module.service';

describe('MapModuleService', () => {
  let service: MapModuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockProvider(ModuleService)],
    });
    service = TestBed.inject(MapModuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
