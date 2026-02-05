import { TestBed } from '@angular/core/testing';

import { DataLayersService } from './data-layers.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('DatalayersService', () => {
  let service: DataLayersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(DataLayersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
