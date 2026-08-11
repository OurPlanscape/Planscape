import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router, Routes, UrlTree } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { createFeatureGuard, createFeatureMatchGuard } from './feature.guard';
import { FeatureService } from './feature.service';

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

@Component({ standalone: true, template: 'flagged on' })
class FlagOnComponent {}

@Component({ standalone: true, template: 'flagged off' })
class FlagOffComponent {}

describe('createFeatureMatchGuard', () => {
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;

  // two routes on the same path, the flagged one first — the pattern used to
  // swap the `home` component on the WORKSPACES flag
  const routes: Routes = [
    {
      path: 'thing',
      canMatch: [createFeatureMatchGuard('foo')],
      component: FlagOnComponent,
    },
    { path: 'thing', component: FlagOffComponent },
  ];

  beforeEach(() => {
    featureServiceSpy = jasmine.createSpyObj('FeatureService', [
      'isFeatureEnabled',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureService, useValue: featureServiceSpy },
        provideRouter(routes),
        provideLocationMocks(),
      ],
    });
  });

  function runGuard(featureName: string, inverted?: boolean): boolean {
    const guardFn = createFeatureMatchGuard(featureName, inverted);
    let result!: boolean;
    TestBed.runInInjectionContext(() => {
      result = (guardFn as () => boolean)();
    });
    return result;
  }

  it('matches when feature enabled & not inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(true);

    expect(runGuard('foo')).toBeTrue();
  });

  it('does not match when feature disabled & not inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(false);

    expect(runGuard('foo')).toBeFalse();
  });

  it('does not match when feature enabled & inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(true);

    expect(runGuard('foo', true)).toBeFalse();
  });

  it('matches when feature disabled & inverted', () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(false);

    expect(runGuard('foo', true)).toBeTrue();
  });

  it('routes to the flagged component when the feature is enabled', async () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(true);

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/thing');

    expect(component).toBeInstanceOf(FlagOnComponent);
  });

  it('falls through to the next route when the feature is disabled', async () => {
    featureServiceSpy.isFeatureEnabled.and.returnValue(false);

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/thing');

    // navigation is not cancelled — it lands on the second `thing` route
    expect(component).toBeInstanceOf(FlagOffComponent);
    expect(TestBed.inject(Router).url).toBe('/thing');
  });
});
