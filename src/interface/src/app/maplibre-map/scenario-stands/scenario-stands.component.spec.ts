import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
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

  let mockMapLibreMap = {
    on: jasmine.createSpy('on'),
    off: jasmine.createSpy('off'),
  };

  beforeEach(async () => {
    scenarioConfig$ = new BehaviorSubject<any>({}); // no stand_size initially

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
          scenarioConfig$: scenarioConfig$,
          availableStands$: of({} as AvailableStands),
          excludedStands$: of([]),
          doesNotMeetConstraintsStands$: of([]),
          stepIndex$: of(0),
        }),
        MockProvider(MapConfigState, {
          opacity$: of(0),
        }),
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(ScenarioStandsComponent);
    fixture.componentInstance.mapLibreMap = mockMapLibreMap as any;
    fixture.detectChanges(); // let template init
    return { fixture, component: fixture.componentInstance };
  }

  it('reads planId and scenarioId from route snapshot', () => {
    const { component } = create();
    expect(component.planId).toBe(planId);
  });

  it('tilesUrl$ emits only when stand_size exists and updates with latest', fakeAsync(() => {
    const { component } = create();

    const emitted: string[] = [];
    const sub = component.tilesUrl$.subscribe((v) => emitted.push(v));

    // No emission yet (falsy stand_size)
    scenarioConfig$.next({ stand_size: 'BIG' });
    scenarioConfig$.next({ stand_size: 'SMALL' });

    tick(); // flush microtasks

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
    scenarioConfig$.next({}); // still falsy

    tick();

    expect(emitted).toEqual([]);

    sub.unsubscribe();
  }));
});
