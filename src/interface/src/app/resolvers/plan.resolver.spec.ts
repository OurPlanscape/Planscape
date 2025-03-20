import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { planResolver } from './plan.resolver';

describe('planResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => planResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
