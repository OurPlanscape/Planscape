import { TestBed } from '@angular/core/testing';
import { overrideFeatureFlags } from '@features/testing';
import {
  provideDataOrganizationGeometry,
  USE_GEOMETRY,
} from './geometry-datalayers.token';

describe('provideDataOrganizationGeometry', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideDataOrganizationGeometry()],
    });
  });

  it('sends geometry when DATA_ORGANIZATION is on', () => {
    overrideFeatureFlags('DATA_ORGANIZATION');
    expect(TestBed.inject(USE_GEOMETRY)).toBeTrue();
  });

  it('does not send geometry when DATA_ORGANIZATION is off', () => {
    overrideFeatureFlags();
    expect(TestBed.inject(USE_GEOMETRY)).toBeFalse();
  });
});
