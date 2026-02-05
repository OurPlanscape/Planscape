import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { createFeatureGuard } from '@app/features/feature.guard';
import { FeatureService } from '@app/features/feature.service';

describe('createFeatureGuard', () => {
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let fakeUrlTree: UrlTree;
  const FALLBACK = '/fallback';

  beforeEach(() => {
    featureServiceSpy = jasmine.createSpyObj('FeatureService', [
      'isFeatureEnabled',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['parseUrl']);

    // create a concrete UrlTree stub
    fakeUrlTree = {} as UrlTree;
    routerSpy.parseUrl.and.returnValue(fakeUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  function runGuard(options: {
    featureName: string;
    fallback?: string;
    inverted?: boolean;
  }): boolean | UrlTree {
    const guardFn = createFeatureGuard(options);
    let result!: boolean | UrlTree;
    TestBed.runInInjectionContext(() => {
      result = (guardFn as () => boolean | UrlTree)();
    });
    return result;
  }

  it('allows when feature enabled & not inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(true);

    const res = runGuard({ featureName: 'foo', fallback: FALLBACK });
    expect(res).toBeTrue();
  });

  it('redirects when feature disabled & not inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(false);

    const res = runGuard({ featureName: 'foo', fallback: FALLBACK });
    expect(routerSpy.parseUrl).toHaveBeenCalledWith(FALLBACK);
    expect(res).toBe(fakeUrlTree);
  });

  it('redirects when feature enabled & inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(true);

    const res = runGuard({
      featureName: 'foo',
      fallback: FALLBACK,
      inverted: true,
    });
    expect(routerSpy.parseUrl).toHaveBeenCalledWith(FALLBACK);
    expect(res).toBe(fakeUrlTree);
  });

  it('allows when feature disabled & inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(false);

    const res = runGuard({
      featureName: 'foo',
      fallback: FALLBACK,
      inverted: true,
    });
    expect(res).toBeTrue();
  });
});
