import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import {
  ActivatedRoute,
  provideRouter,
  Router,
  Routes,
  UrlTree,
} from '@angular/router';
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

@Component({ standalone: true, template: 'home' })
class HomeStubComponent {}

@Component({ standalone: true, template: 'map viewer' })
class MapViewerStubComponent {}

@Component({ standalone: true, template: 'workspace map viewer' })
class WorkspaceMapViewerStubComponent {
  workspaceId = inject(ActivatedRoute).snapshot.paramMap.get('workspaceId');
}

@Component({ standalone: true, template: 'plan map viewer' })
class PlanMapViewerStubComponent {
  planId = inject(ActivatedRoute).snapshot.paramMap.get('planId');
}

@Component({ standalone: true, template: 'plan scenario map viewer' })
class PlanScenarioMapViewerStubComponent {}

describe('map viewer routes', () => {
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;

  // mirrors the `map-viewer` routes in the app routing module
  const routes: Routes = [
    { path: 'home', component: HomeStubComponent },
    {
      path: 'map-viewer',
      canActivate: [
        createFeatureGuard({
          featureName: 'WORKSPACES',
          inverted: true,
          fallback: '/home',
        }),
      ],
      component: MapViewerStubComponent,
    },
    {
      path: 'map-viewer/workspace/:workspaceId',
      canMatch: [createFeatureMatchGuard('WORKSPACES')],
      component: WorkspaceMapViewerStubComponent,
    },
    { path: 'map-viewer/:planId', component: PlanMapViewerStubComponent },
    {
      path: 'map-viewer/:planId/:scenarioId',
      component: PlanScenarioMapViewerStubComponent,
    },
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

  describe('with workspaces enabled', () => {
    beforeEach(() => featureServiceSpy.isFeatureEnabled.and.returnValue(true));

    it('redirects a bare map-viewer to home', async () => {
      const harness = await RouterTestingHarness.create();
      const component = await harness.navigateByUrl('/map-viewer');

      expect(component).toBeInstanceOf(HomeStubComponent);
      expect(TestBed.inject(Router).url).toBe('/home');
    });

    it('opens the map viewer for a workspace', async () => {
      const harness = await RouterTestingHarness.create();
      const component = await harness.navigateByUrl(
        '/map-viewer/workspace/7',
        WorkspaceMapViewerStubComponent
      );

      expect(component.workspaceId).toBe('7');
    });

    it('keeps the existing plan routes', async () => {
      const harness = await RouterTestingHarness.create();
      const component = await harness.navigateByUrl(
        '/map-viewer/12',
        PlanMapViewerStubComponent
      );

      expect(component.planId).toBe('12');
      expect(await harness.navigateByUrl('/map-viewer/12/34')).toBeInstanceOf(
        PlanScenarioMapViewerStubComponent
      );
    });
  });

  describe('with workspaces disabled', () => {
    beforeEach(() => featureServiceSpy.isFeatureEnabled.and.returnValue(false));

    it('opens the map viewer without a workspace', async () => {
      const harness = await RouterTestingHarness.create();
      const component = await harness.navigateByUrl('/map-viewer');

      expect(component).toBeInstanceOf(MapViewerStubComponent);
      expect(TestBed.inject(Router).url).toBe('/map-viewer');
    });

    it('keeps the existing plan routes', async () => {
      const harness = await RouterTestingHarness.create();
      const component = await harness.navigateByUrl('/map-viewer/12');

      expect(component).toBeInstanceOf(PlanMapViewerStubComponent);
    });
  });
});
