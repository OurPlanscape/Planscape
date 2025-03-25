import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  ParamMap,
  RouterStateSnapshot,
} from '@angular/router';
import { PlanState } from '../plan/plan.state';
import { planResolver } from './plan.resolver';
import { PlanService } from '@services';
import { MockProvider } from 'ng-mocks';

/**
 * Minimal mock ParamMap helper.
 */
function createParamMap(params: Record<string, string>): ParamMap {
  return {
    get: (key) => params[key] ?? null,
    has: (key) => key in params,
    keys: Object.keys(params),
  } as ParamMap;
}

describe('planResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlanState,
        // Provide a mocked PlanService so we don't need HttpClient
        MockProvider(PlanService),
      ],
    });
  });

  it('should return true always', () => {
    // Provide a minimal paramMap ({}) so route.paramMap is never undefined:
    const route = {
      paramMap: createParamMap({}),
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      planResolver(route, {} as RouterStateSnapshot)
    );

    expect(result).toBeTrue(); // confirms the resolver always returns true
  });

  it('should call setPlanId if "id" param is present', () => {
    const planState = TestBed.inject(PlanState);
    const spy = spyOn(planState, 'setPlanId');

    const route = {
      paramMap: createParamMap({ id: '123' }),
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      planResolver(route, {} as RouterStateSnapshot)
    );

    expect(result).toBeTrue();
    expect(spy).toHaveBeenCalledOnceWith(123);
  });

  it('should call setPlanId if "planId" param is present', () => {
    const planState = TestBed.inject(PlanState);
    const spy = spyOn(planState, 'setPlanId');

    const route = {
      paramMap: createParamMap({ planId: '987' }),
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      planResolver(route, {} as RouterStateSnapshot)
    );

    expect(result).toBeTrue();
    expect(spy).toHaveBeenCalledOnceWith(987);
  });

  it('should NOT call setPlanId if neither param is present', () => {
    const planState = TestBed.inject(PlanState);
    const spy = spyOn(planState, 'setPlanId');

    // paramMap is empty object -> no "id" or "planId"
    const route = {
      paramMap: createParamMap({}),
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      planResolver(route, {} as RouterStateSnapshot)
    );

    expect(result).toBeTrue();
    expect(spy).not.toHaveBeenCalled();
  });
});
