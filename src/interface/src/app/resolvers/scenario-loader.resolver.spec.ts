// scenario-loader.resolver.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  RouterStateSnapshot,
} from '@angular/router';
import { ScenarioState } from '../maplibre-map/scenario.state';
import { scenarioLoaderResolver } from './scenario-loader.resolver';

describe('scenarioLoaderResolver', () => {
  let mockScenarioState: jasmine.SpyObj<ScenarioState>;
  // a throw-away RouterStateSnapshot
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    mockScenarioState = jasmine.createSpyObj('ScenarioState', [
      'setScenarioId',
      'resetScenarioId',
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: ScenarioState, useValue: mockScenarioState }],
    });
  });

  function makeRoute(params: {
    id?: string;
    scenarioId?: string;
  }): ActivatedRouteSnapshot {
    return {
      paramMap: convertToParamMap(params),
    } as any as ActivatedRouteSnapshot;
  }

  it('sets scenarioId and returns it', () => {
    const route = makeRoute({ scenarioId: '123' });

    const result = TestBed.runInInjectionContext(() =>
      scenarioLoaderResolver(route, dummyState)
    );

    expect(mockScenarioState.setScenarioId).toHaveBeenCalledWith(123);
    expect(mockScenarioState.resetScenarioId).not.toHaveBeenCalled();
    expect(result).toBe(123);
  });

  it('calls resetScenarioId and returns null when scenarioId param is not present', () => {
    const route = makeRoute({});

    const result = TestBed.runInInjectionContext(() =>
      scenarioLoaderResolver(route, dummyState)
    );

    expect(mockScenarioState.setScenarioId).not.toHaveBeenCalled();
    expect(mockScenarioState.resetScenarioId).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('calls resetScenarioId and returns null on invalid numeric value', () => {
    const route = makeRoute({ scenarioId: 'foo' });

    const result = TestBed.runInInjectionContext(() =>
      scenarioLoaderResolver(route, dummyState)
    );

    expect(mockScenarioState.setScenarioId).not.toHaveBeenCalled();
    expect(mockScenarioState.resetScenarioId).toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
