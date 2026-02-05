// scenario-loader.resolver.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { ScenarioState } from '@app/scenario/scenario.state';
import { scenarioLoaderResolver } from '@app/resolvers/scenario-loader.resolver';

describe('scenarioLoaderResolver', () => {
  let mockScenarioState: jasmine.SpyObj<ScenarioState>;
  let mockRouter: jasmine.SpyObj<Router>;
  // a throw-away RouterStateSnapshot
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    mockScenarioState = jasmine.createSpyObj('ScenarioState', [
      'setScenarioId',
      'resetScenarioId',
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ScenarioState, useValue: mockScenarioState },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  function makeRoute(params: {
    planId?: string;
    scenarioId?: string;
  }): ActivatedRouteSnapshot {
    return {
      paramMap: convertToParamMap(params),
    } as any as ActivatedRouteSnapshot;
  }

  it('sets scenarioId and returns it', () => {
    const route = makeRoute({ planId: '42', scenarioId: '123' });

    const result = TestBed.runInInjectionContext(() =>
      scenarioLoaderResolver(route, dummyState)
    );

    expect(mockScenarioState.setScenarioId).toHaveBeenCalledWith(123);
    expect(mockScenarioState.resetScenarioId).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(result).toBe(123);
  });

  it('calls resetScenarioId, navigates back to plan and returns null when scenarioId param is not present', () => {
    const route = makeRoute({ planId: '42' });

    const result = TestBed.runInInjectionContext(() =>
      scenarioLoaderResolver(route, dummyState)
    );

    expect(mockScenarioState.setScenarioId).not.toHaveBeenCalled();
    expect(mockScenarioState.resetScenarioId).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/plan', '42']);
    expect(result).toBeNull();
  });

  it('calls resetScenarioId, navigates back to plan and returns null on invalid numeric value', () => {
    const route = makeRoute({ planId: '42', scenarioId: 'foo' });

    const result = TestBed.runInInjectionContext(() =>
      scenarioLoaderResolver(route, dummyState)
    );

    expect(mockScenarioState.setScenarioId).not.toHaveBeenCalled();
    expect(mockScenarioState.resetScenarioId).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/plan', '42']);
    expect(result).toBeNull();
  });
});
