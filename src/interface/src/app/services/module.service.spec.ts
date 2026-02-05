import { TestBed } from '@angular/core/testing';

import { ModuleService } from '@services/module.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ModulesService', () => {
  let service: ModuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ModuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
