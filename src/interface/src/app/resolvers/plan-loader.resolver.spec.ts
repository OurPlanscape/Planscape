import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  ParamMap,
  RouterStateSnapshot,
} from '@angular/router';
import { PlanState } from '@app/plan/plan.state';
import { planLoaderResolver } from '@app/resolvers/plan-loader.resolver';
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

describe('planLoaderResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlanState,
        // Provide a mocked PlanService so we don't need HttpClient
        MockProvider(PlanService),
      ],
    });
  });

  it('should call setPlanId if "planId" param is present', () => {
    const planState = TestBed.inject(PlanState);
    const spy = spyOn(planState, 'setPlanId');

    const route = {
      paramMap: createParamMap({ planId: '987' }),
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      planLoaderResolver(route, {} as RouterStateSnapshot)
    );

    expect(result).toBe(987);
    expect(spy).toHaveBeenCalledOnceWith(987);
  });

  it('should NOT call setPlanId if planId is NOT present', () => {
    const planState = TestBed.inject(PlanState);
    const spy = spyOn(planState, 'setPlanId');

    // paramMap is empty object -> no "planId"
    const route = {
      paramMap: createParamMap({}),
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      planLoaderResolver(route, {} as RouterStateSnapshot)
    );

    expect(result).toBeFalsy();
    expect(spy).not.toHaveBeenCalled();
  });
});
