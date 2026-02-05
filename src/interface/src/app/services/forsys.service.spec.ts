import { TestBed } from '@angular/core/testing';

import { ForsysService } from '@services/forsys.service';
import { MockProvider } from 'ng-mocks';
import { ModuleService } from '@services/module.service';

describe('ForsysService', () => {
  let service: ForsysService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockProvider(ModuleService)],
    });
    service = TestBed.inject(ForsysService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
