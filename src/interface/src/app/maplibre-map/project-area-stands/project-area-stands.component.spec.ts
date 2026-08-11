import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import {
  ImageComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { MARTIN_SOURCES } from '@treatments/map.sources';
import { BehaviorSubject, of } from 'rxjs';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { AvailableStands } from '@types';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { MapConfigState } from '../map-config.state';
import { ProjectAreaStandsComponent } from './project-area-stands.component';


describe('ProjectAreaStandsComponent', () => {
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
      imports: [ProjectAreaStandsComponent],
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
    const fixture = TestBed.createComponent(ProjectAreaStandsComponent);
    fixture.componentInstance.mapLibreMap = mockMapLibreMap;
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('reads planId from route snapshot', () => {
    const { component } = create();
    expect(component.planId).toBe(planId);
  });

  it('tilesUrl$ emits once for stand_size changes (URL is identical, distinctUntilChanged collapses)', fakeAsync(() => {
    const { component } = create();

    const emitted: string[] = [];
    const sub = component.tilesUrl$.subscribe((v) => emitted.push(v));

    scenarioConfig$.next({ stand_size: 'LARGE' });
    scenarioConfig$.next({ stand_size: 'SMALL' });

    tick();

    const base = MARTIN_SOURCES.standsByProjectAreas.tilesUrl;
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toContain(
      `${base}?scenario_id=${scenarioId}`
    );

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
    });
  });
});
