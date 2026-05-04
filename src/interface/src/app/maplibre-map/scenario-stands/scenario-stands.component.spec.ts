import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ScenarioStandsComponent } from './scenario-stands.component';
import { MARTIN_SOURCES } from '@treatments/map.sources';
import {
  ImageComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

import { MockDeclarations, MockProvider } from 'ng-mocks';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { AvailableStands } from '@types';
import { MapConfigState } from '../map-config.state';

describe('ScenarioStandsComponent', () => {
  const planId = 456;
  const scenarioId = 123;

  let scenarioConfig$: BehaviorSubject<any>;
  let excludedStands$: BehaviorSubject<number[]>;
  let doesNotMeetConstraintsStands$: BehaviorSubject<number[]>;
  let currentStep$: BehaviorSubject<any>;

  let mockMapLibreMap: jasmine.SpyObj<any>;

  beforeEach(async () => {
    scenarioConfig$ = new BehaviorSubject<any>({});
    excludedStands$ = new BehaviorSubject<number[]>([]);
    doesNotMeetConstraintsStands$ = new BehaviorSubject<number[]>([]);
    currentStep$ = new BehaviorSubject<any>(null);

    mockMapLibreMap = jasmine.createSpyObj('MapLibreMap', [
      'on',
      'off',
      'isSourceLoaded',
      'setFeatureState',
      'removeFeatureState',
    ]);
    mockMapLibreMap.isSourceLoaded.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [ScenarioStandsComponent],
      declarations: [
        MockDeclarations(LayerComponent, VectorSourceComponent, ImageComponent),
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { scenarioId, planId } } },
        },
        MockProvider(NewScenarioState, {
          scenarioConfig$,
          availableStands$: of({} as AvailableStands),
          excludedStands$,
          doesNotMeetConstraintsStands$,
          currentStep$,
          setLoading: jasmine.createSpy('setLoading'),
          setBaseStandsLoaded: jasmine.createSpy('setBaseStandsLoaded'),
        }),
        MockProvider(MapConfigState, {
          opacity$: of(0),
        }),
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(ScenarioStandsComponent);
    fixture.componentInstance.mapLibreMap = mockMapLibreMap;
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('reads planId from route snapshot', () => {
    const { component } = create();
    expect(component.planId).toBe(planId);
  });

  it('tilesUrl$ emits only when stand_size exists and updates with latest', fakeAsync(() => {
    const { component } = create();

    const emitted: string[] = [];
    const sub = component.tilesUrl$.subscribe((v) => emitted.push(v));

    scenarioConfig$.next({ stand_size: 'BIG' });
    scenarioConfig$.next({ stand_size: 'SMALL' });

    tick();

    const base = MARTIN_SOURCES.scenarioStands.tilesUrl;
    expect(emitted).toEqual([
      `${base}?planning_area_id=${planId}&stand_size=BIG`,
      `${base}?planning_area_id=${planId}&stand_size=SMALL`,
    ]);

    sub.unsubscribe();
  }));

  it('tilesUrl$ does not emit for falsy stand_size values (filter)', fakeAsync(() => {
    const { component } = create();

    const emitted: string[] = [];
    const sub = component.tilesUrl$.subscribe((v) => emitted.push(v));

    scenarioConfig$.next({ stand_size: null });
    scenarioConfig$.next({ stand_size: undefined });
    scenarioConfig$.next({});

    tick();

    expect(emitted).toEqual([]);

    sub.unsubscribe();
  }));

  describe('ngOnInit', () => {
    it('registers sourcedata and styledata listeners on the map', () => {
      create();
      expect(mockMapLibreMap.on).toHaveBeenCalledWith(
        'sourcedata',
        jasmine.any(Function)
      );
      expect(mockMapLibreMap.on).toHaveBeenCalledWith(
        'styledata',
        jasmine.any(Function)
      );
    });

    it('does not crash when excluded stands ReplaySubject has a buffered value on subscribe', () => {
      // Regression: subscriptions were in the constructor, before mapLibreMap input was bound.
      // Using a ReplaySubject with a pre-seeded value reproduces the original crash.
      const replay = new ReplaySubject<number[]>(1);
      replay.next([1, 2, 3]);

      TestBed.overrideProvider(NewScenarioState, {
        useValue: {
          scenarioConfig$,
          availableStands$: of({} as AvailableStands),
          excludedStands$: replay,
          doesNotMeetConstraintsStands$: of([]),
          currentStep$: of(null),
          setLoading: jasmine.createSpy(),
          setBaseStandsLoaded: jasmine.createSpy(),
        },
      });

      expect(() => create()).not.toThrow();
      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledTimes(3);
    });
  });

  describe('excluded stands painting', () => {
    it('calls setFeatureState for each excluded stand', () => {
      create();
      excludedStands$.next([10, 20, 30]);

      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledTimes(3);
      [10, 20, 30].forEach((id) =>
        expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledWith(
          {
            source: jasmine.any(String),
            sourceLayer: jasmine.any(String),
            id,
          },
          { excluded: true }
        )
      );
    });

    it('removes old excluded stands before painting new ones', () => {
      create();
      excludedStands$.next([1, 2]);
      mockMapLibreMap.setFeatureState.calls.reset();
      mockMapLibreMap.removeFeatureState.calls.reset();

      excludedStands$.next([3]);

      expect(mockMapLibreMap.removeFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 1 }),
        'excluded'
      );
      expect(mockMapLibreMap.removeFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 2 }),
        'excluded'
      );
      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 3 }),
        { excluded: true }
      );
    });
  });

  describe('constrained stands painting', () => {
    it('calls setFeatureState for each constrained stand', () => {
      create();
      doesNotMeetConstraintsStands$.next([5, 6]);

      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 5 }),
        { constrained: true }
      );
      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 6 }),
        { constrained: true }
      );
    });

    it('removes old constrained stands before painting new ones', () => {
      create();
      doesNotMeetConstraintsStands$.next([7, 8]);
      mockMapLibreMap.removeFeatureState.calls.reset();
      mockMapLibreMap.setFeatureState.calls.reset();

      doesNotMeetConstraintsStands$.next([9]);

      expect(mockMapLibreMap.removeFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 7 }),
        'constrained'
      );
      expect(mockMapLibreMap.removeFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 8 }),
        'constrained'
      );
      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 9 }),
        { constrained: true }
      );
    });
  });

  describe('currentStep$ subscription', () => {
    it('clears constrained stands when step is null', () => {
      create();
      doesNotMeetConstraintsStands$.next([1, 2]);
      mockMapLibreMap.removeFeatureState.calls.reset();

      currentStep$.next(null);

      expect(mockMapLibreMap.removeFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 1 }),
        'constrained'
      );
      expect(mockMapLibreMap.removeFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 2 }),
        'constrained'
      );
    });

    it('clears constrained stands when step does not include constraints', () => {
      create();
      doesNotMeetConstraintsStands$.next([3]);
      mockMapLibreMap.removeFeatureState.calls.reset();

      currentStep$.next({ includeConstraints: false });

      expect(mockMapLibreMap.removeFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 3 }),
        'constrained'
      );
    });

    it('does not clear constrained stands when step includes constraints', () => {
      create();
      doesNotMeetConstraintsStands$.next([4]);
      mockMapLibreMap.removeFeatureState.calls.reset();

      currentStep$.next({ includeConstraints: true });

      expect(mockMapLibreMap.removeFeatureState).not.toHaveBeenCalled();
    });
  });

  describe('styledata listener', () => {
    it('re-applies excluded and constrained stands on style reload', () => {
      create();
      excludedStands$.next([1]);
      doesNotMeetConstraintsStands$.next([2]);
      mockMapLibreMap.setFeatureState.calls.reset();
      mockMapLibreMap.removeFeatureState.calls.reset();

      // get the styledata handler that was registered and invoke it
      const styleCb = mockMapLibreMap.on.calls
        .all()
        .find((c: any) => c.args[0] === 'styledata')?.args[1];
      styleCb();

      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 1 }),
        { excluded: true }
      );
      expect(mockMapLibreMap.setFeatureState).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 2 }),
        { constrained: true }
      );
    });
  });

  describe('ngOnDestroy', () => {
    it('removes sourcedata and styledata listeners from the map', () => {
      const { fixture } = create();
      fixture.destroy();

      expect(mockMapLibreMap.off).toHaveBeenCalledWith(
        'sourcedata',
        jasmine.any(Function)
      );
      expect(mockMapLibreMap.off).toHaveBeenCalledWith(
        'styledata',
        jasmine.any(Function)
      );
    });
  });
});
