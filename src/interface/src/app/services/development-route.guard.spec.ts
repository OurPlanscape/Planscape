import { TestBed } from '@angular/core/testing';

import { DevelopmentRouteGuard } from './development-route.guard';

describe('DevelopmentRouteGuardService', () => {
  let guard: DevelopmentRouteGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(DevelopmentRouteGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
