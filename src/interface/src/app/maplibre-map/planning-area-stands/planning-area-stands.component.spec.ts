import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PlanningAreaStandsComponent } from './planning-area-stands.component';
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

describe('PlanningAreaStandsComponent', () => {
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
      imports: [PlanningAreaStandsComponent],
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
    const fixture = TestBed.createComponent(PlanningAreaStandsComponent);
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
    expect(emitted[0]).toContain(
      `${base}?planning_area_id=${planId}&stand_size=BIG`
    );

    expect(emitted[1]).toContain(
      `${base}?planning_area_id=${planId}&stand_size=SMALL`
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
