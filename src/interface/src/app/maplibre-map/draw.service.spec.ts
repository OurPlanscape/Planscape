import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DrawService } from './draw.service';
import { FeatureService } from '../features/feature.service';
import { MockProvider } from 'ng-mocks';

describe('DrawService', () => {
  let service: DrawService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DrawService, MockProvider(FeatureService)],
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(DrawService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
