import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { Map as MapLibreMap } from 'maplibre-gl';

import { StandsComponent } from './stands.component';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { MapConfigState } from '../map-config.state';
import { MARTIN_SOURCES } from '@treatments/map.sources';
import { FrontendConstants } from '@map/map.constants';
import { BASE_COLORS } from '@treatments/map.styles';

describe('StandsComponent', () => {
  let component: StandsComponent;
  let fixture: ComponentFixture<StandsComponent>;

  let currentStep$: BehaviorSubject<any>;
  let scenarioConfig$: BehaviorSubject<any>;
  let excludedStands$: BehaviorSubject<number[]>;
  let constrainedStands$: BehaviorSubject<number[]>;
  let opacity$: BehaviorSubject<number>;

  let newScenarioStateMock: jasmine.SpyObj<NewScenarioState>;
  let mapLibreMapMock: jasmine.SpyObj<MapLibreMap>;

  let sourceDataListener: ((event: any) => void) | undefined;
  let styleDataListener: (() => void) | undefined;

  const scenarioId = 1;
  const planId = '4150';

  beforeEach(async () => {
    currentStep$ = new BehaviorSubject<any>(null);
    scenarioConfig$ = new BehaviorSubject<any>({});
    excludedStands$ = new BehaviorSubject<number[]>([]);
    constrainedStands$ = new BehaviorSubject<number[]>([]);
    opacity$ = new BehaviorSubject<number>(0.5);

    newScenarioStateMock = jasmine.createSpyObj<NewScenarioState>(
      'NewScenarioState',
      ['setBaseStandsLoaded', 'setBaseStandsLoading'],
      {
        currentStep$: currentStep$.asObservable(),
        scenarioConfig$: scenarioConfig$.asObservable(),
        excludedStands$: excludedStands$.asObservable(),
        doesNotMeetConstraintsStands$: constrainedStands$.asObservable(),
      }
    );

    mapLibreMapMock = jasmine.createSpyObj<MapLibreMap>('MapLibreMap', [
      'on',
      'off',
      'once',
      'isSourceLoaded',
      'getSource',
      'setFeatureState',
      'removeFeatureState',
    ]);

    mapLibreMapMock.on.and.callFake(((
      eventName: string,
      listener: (...args: any[]) => void
    ) => {
      if (eventName === 'sourcedata') {
        sourceDataListener = listener;
      }

      if (eventName === 'styledata') {
        styleDataListener = listener;
      }

      return mapLibreMapMock;
    }) as any);

    mapLibreMapMock.off.and.returnValue(mapLibreMapMock);
    mapLibreMapMock.once.and.returnValue(mapLibreMapMock);
    mapLibreMapMock.isSourceLoaded.and.returnValue(false);

    // By default, consider the source available.
    mapLibreMapMock.getSource.and.returnValue({} as any);

    await TestBed.configureTestingModule({
      imports: [StandsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                scenarioId,
                planId,
              },
            },
          },
        },
        {
          provide: NewScenarioState,
          useValue: newScenarioStateMock,
        },
        {
          provide: MapConfigState,
          useValue: {
            opacity$: opacity$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StandsComponent);
    component = fixture.componentInstance;

    // Important: mapLibreMap is used during ngOnInit.
    component.mapLibreMap = mapLibreMapMock;

    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('sourceName', () => {
    it('should use scenario stands source by default', () => {
      expect(component.sourceName).toBe(
        MARTIN_SOURCES.scenarioStands.sources.stands
      );
    });

    it('should use stands by project areas when hasParent is true and withIncludes is false', () => {
      component.hasParent = true;

      expect(component.sourceName).toBe(
        MARTIN_SOURCES.standsByProjectAreas.sources.stands
      );
    });

    it('should use standsWithIncludes when withIncludes is true and hasParent is false', () => {
      currentStep$.next({
        withIncludes: true,
      });

      expect(component.sourceName).toBe(
        MARTIN_SOURCES.scenarioStands.sources.standsWithIncludes
      );
    });

    it('should use treatable stands by project areas when withIncludes and hasParent are true', () => {
      component.hasParent = true;

      currentStep$.next({
        withIncludes: true,
      });

      expect(component.sourceName).toBe(
        MARTIN_SOURCES.treatableStandsByProjectAreas.sources.stands
      );
    });
  });

  describe('planId', () => {
    it('should return route planId when hasParent is false and withIncludes is false', () => {
      expect(component.planId).toBe(planId);
    });

    it('should return undefined when hasParent is true and withIncludes is false', () => {
      component.hasParent = true;

      expect(component.planId).toBeUndefined();
    });

    it('should return undefined when withIncludes is true and hasParent is false', () => {
      currentStep$.next({
        withIncludes: true,
      });

      expect(component.planId).toBeUndefined();
    });

    it('should return route planId when withIncludes and hasParent are true', () => {
      component.hasParent = true;

      currentStep$.next({
        withIncludes: true,
      });

      expect(component.planId).toBe(planId);
    });
  });

  describe('tilesUrl$', () => {
    it('should create scenario stands URL when withIncludes is false and hasParent is false', async () => {
      scenarioConfig$.next({
        stand_size: 20,
      });

      const url = await firstValueFrom(component.tilesUrl$.pipe(take(1)));

      expect(url).toContain(MARTIN_SOURCES.scenarioStands.tilesUrl);
      expect(url).toContain(`planning_area_id=${planId}`);
      expect(url).toContain('stand_size=20');
      expect(url).toContain('datetime=');
    });

    it('should create stands by project areas URL when hasParent is true', async () => {
      component.hasParent = true;

      scenarioConfig$.next({
        stand_size: 20,
      });

      const url = await firstValueFrom(component.tilesUrl$.pipe(take(1)));

      expect(url).toContain(MARTIN_SOURCES.standsByProjectAreas.tilesUrl);
      expect(url).toContain(`scenario_id=${scenarioId}`);
      expect(url).toContain('stand_size=20');
      expect(url).toContain('datetime=');
    });

    it('should create stands with includes URL when withIncludes is true', async () => {
      currentStep$.next({
        withIncludes: true,
      });

      scenarioConfig$.next({
        stand_size: 20,
      });

      const url = await firstValueFrom(component.tilesUrl$.pipe(take(1)));

      expect(url).toContain(MARTIN_SOURCES.scenarioStands.tilesWithIncludesUrl);
      expect(url).toContain(`scenario_id=${scenarioId}`);
      expect(url).toContain('stand_size=20');
      expect(url).toContain('datetime=');
    });

    it('should create treatable stands by project areas URL when withIncludes and hasParent are true', async () => {
      component.hasParent = true;

      currentStep$.next({
        withIncludes: true,
      });

      scenarioConfig$.next({
        stand_size: 20,
      });

      const url = await firstValueFrom(component.tilesUrl$.pipe(take(1)));

      expect(url).toBe(
        `${MARTIN_SOURCES.treatableStandsByProjectAreas.tilesUrl}?scenario_id=${scenarioId}`
      );
    });

    it('should set base stands loading when a new tiles URL is generated', async () => {
      scenarioConfig$.next({
        stand_size: 20,
      });

      await firstValueFrom(component.tilesUrl$.pipe(take(1)));

      expect(newScenarioStateMock.setBaseStandsLoading).toHaveBeenCalledWith(
        true
      );

      expect(newScenarioStateMock.setBaseStandsLoaded).toHaveBeenCalledWith(
        false
      );
    });

    it('should not emit a tiles URL until stand_size is available', () => {
      const emittedUrls: string[] = [];

      const subscription = component.tilesUrl$.subscribe((url) =>
        emittedUrls.push(url)
      );

      scenarioConfig$.next({});

      expect(emittedUrls.length).toBe(0);

      subscription.unsubscribe();
    });
  });

  describe('filteredStands$', () => {
    it('should filter excluded stands when excluded areas and constraints are both enabled', async () => {
      currentStep$.next({
        includeExcludedAreas: true,
        includeConstraints: true,
      });

      excludedStands$.next([1, 2, 3]);

      const filter = await firstValueFrom(
        component.filteredStands$.pipe(take(1))
      );

      const expectedFilter: any = [
        '!',
        ['in', ['get', 'id'], ['literal', [1, 2, 3]]],
      ];

      expect(filter as any).toEqual(expectedFilter);
    });

    it('should return undefined when there are no excluded stands', async () => {
      currentStep$.next({
        includeExcludedAreas: true,
        includeConstraints: true,
      });

      excludedStands$.next([]);

      const filter = await firstValueFrom(
        component.filteredStands$.pipe(take(1))
      );

      expect(filter).toBeUndefined();
    });

    it('should return undefined when constraints are disabled', async () => {
      currentStep$.next({
        includeExcludedAreas: true,
        includeConstraints: false,
      });

      excludedStands$.next([1, 2, 3]);

      const filter = await firstValueFrom(
        component.filteredStands$.pipe(take(1))
      );

      expect(filter).toBeUndefined();
    });

    it('should return undefined when excluded areas are disabled', async () => {
      currentStep$.next({
        includeExcludedAreas: false,
        includeConstraints: true,
      });

      excludedStands$.next([1, 2, 3]);

      const filter = await firstValueFrom(
        component.filteredStands$.pipe(take(1))
      );

      expect(filter).toBeUndefined();
    });
  });

  describe('MapLibre listeners', () => {
    it('should register sourcedata and styledata listeners on init', () => {
      expect(mapLibreMapMock.on).toHaveBeenCalledWith(
        'sourcedata',
        jasmine.any(Function)
      );

      expect(mapLibreMapMock.on).toHaveBeenCalledWith(
        'styledata',
        jasmine.any(Function)
      );
    });

    it('should unregister sourcedata and styledata listeners on destroy', () => {
      fixture.destroy();

      expect(mapLibreMapMock.off).toHaveBeenCalledWith(
        'sourcedata',
        jasmine.any(Function)
      );

      expect(mapLibreMapMock.off).toHaveBeenCalledWith(
        'styledata',
        jasmine.any(Function)
      );
    });
  });

  describe('source loading', () => {
    it('should mark base stands as loaded when source is already loaded after view init', () => {
      const localFixture = TestBed.createComponent(StandsComponent);
      const localComponent = localFixture.componentInstance;

      mapLibreMapMock.isSourceLoaded.and.returnValue(true);

      localComponent.mapLibreMap = mapLibreMapMock;

      localFixture.detectChanges();

      expect(newScenarioStateMock.setBaseStandsLoaded).toHaveBeenCalledWith(
        true
      );

      expect(newScenarioStateMock.setBaseStandsLoading).toHaveBeenCalledWith(
        false
      );

      localFixture.destroy();
    });

    it('should mark base stands as loaded when sourcedata reports the source as loaded', () => {
      expect(sourceDataListener).toBeDefined();

      sourceDataListener!({
        sourceId: component.sourceName,
        isSourceLoaded: true,
        type: 'sourcedata',
        sourceDataType: undefined,
      });

      expect(newScenarioStateMock.setBaseStandsLoaded).toHaveBeenCalledWith(
        true
      );

      expect(newScenarioStateMock.setBaseStandsLoading).toHaveBeenCalledWith(
        false
      );
    });

    it('should ignore sourcedata events from another source', () => {
      newScenarioStateMock.setBaseStandsLoaded.calls.reset();
      newScenarioStateMock.setBaseStandsLoading.calls.reset();

      sourceDataListener!({
        sourceId: 'another-source',
        isSourceLoaded: true,
        type: 'sourcedata',
        sourceDataType: undefined,
      });

      expect(newScenarioStateMock.setBaseStandsLoaded).not.toHaveBeenCalled();

      expect(newScenarioStateMock.setBaseStandsLoading).not.toHaveBeenCalled();
    });

    it('should ignore sourcedata when source is not loaded', () => {
      newScenarioStateMock.setBaseStandsLoaded.calls.reset();

      sourceDataListener!({
        sourceId: component.sourceName,
        isSourceLoaded: false,
        type: 'sourcedata',
        sourceDataType: undefined,
      });

      expect(newScenarioStateMock.setBaseStandsLoaded).not.toHaveBeenCalled();
    });
  });

  describe('feature states', () => {
    it('should paint excluded stands when excludedStands$ emits', () => {
      excludedStands$.next([10, 20]);

      expect(mapLibreMapMock.setFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 10,
        },
        {
          excluded: true,
        }
      );

      expect(mapLibreMapMock.setFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 20,
        },
        {
          excluded: true,
        }
      );
    });

    it('should paint constrained stands when doesNotMeetConstraintsStands$ emits', () => {
      constrainedStands$.next([30, 40]);

      expect(mapLibreMapMock.setFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 30,
        },
        {
          constrained: true,
        }
      );

      expect(mapLibreMapMock.setFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 40,
        },
        {
          constrained: true,
        }
      );
    });

    it('should remove previous excluded feature states before painting new ones', () => {
      excludedStands$.next([10, 20]);

      mapLibreMapMock.removeFeatureState.calls.reset();
      mapLibreMapMock.setFeatureState.calls.reset();

      excludedStands$.next([30]);

      expect(mapLibreMapMock.removeFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 10,
        },
        'excluded'
      );

      expect(mapLibreMapMock.removeFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 20,
        },
        'excluded'
      );

      expect(mapLibreMapMock.setFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 30,
        },
        {
          excluded: true,
        }
      );
    });

    it('should remove constrained feature states when navigating to a step without constraints', () => {
      constrainedStands$.next([10, 20]);

      mapLibreMapMock.removeFeatureState.calls.reset();

      currentStep$.next({
        includeConstraints: false,
      });

      expect(mapLibreMapMock.removeFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 10,
        },
        'constrained'
      );

      expect(mapLibreMapMock.removeFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 20,
        },
        'constrained'
      );
    });

    it('should retry setting feature state on idle when source is not ready', () => {
      mapLibreMapMock.getSource.and.returnValue(undefined);

      excludedStands$.next([10]);

      expect(mapLibreMapMock.setFeatureState).not.toHaveBeenCalled();

      expect(mapLibreMapMock.once).toHaveBeenCalledWith(
        'idle',
        jasmine.any(Function)
      );
    });
  });

  describe('styledata', () => {
    it('should repaint excluded and constrained stands after styledata', () => {
      excludedStands$.next([10]);
      constrainedStands$.next([20]);

      mapLibreMapMock.setFeatureState.calls.reset();

      styleDataListener!();

      expect(mapLibreMapMock.setFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 10,
        },
        {
          excluded: true,
        }
      );

      expect(mapLibreMapMock.setFeatureState).toHaveBeenCalledWith(
        {
          source: component.sourceName,
          sourceLayer: component.sourceName,
          id: 20,
        },
        {
          constrained: true,
        }
      );
    });
  });

  describe('standPaint$', () => {
    it('should emit the default opacity immediately', async () => {
      const paint = await firstValueFrom(component.standPaint$.pipe(take(1)));

      expect(paint['fill-opacity']).toBe(
        FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY
      );

      expect(paint['fill-color']).toEqual([
        'case',
        ['==', ['feature-state', 'excluded'], true],
        BASE_COLORS.dark_gray,
        ['==', ['feature-state', 'constrained'], true],
        BASE_COLORS.light_gray,
        BASE_COLORS.dark_magenta,
      ]);
    });
  });

  describe('trackBySourceName', () => {
    it('should return source name', () => {
      expect(component.trackBySourceName(0, 'test-source')).toBe('test-source');
    });
  });
});
