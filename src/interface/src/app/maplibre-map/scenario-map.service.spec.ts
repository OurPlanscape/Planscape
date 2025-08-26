import { TestBed } from '@angular/core/testing';

import { ScenarioMapService } from './scenario-map.service';

describe('ScenarioMapService', () => {
  let service: ScenarioMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScenarioMapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
