import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { treatmentStateResolver } from './treatment-state.resolver';

describe('treatmentStateResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => treatmentStateResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
