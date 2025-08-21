import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ScenarioStandsComponent } from './scenario-stands.component';
import { ScenarioState } from '../../scenario/scenario.state';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { BASE_COLORS } from '../../treatments/map.styles';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

import { MockDeclaration } from 'ng-mocks';

describe('ScenarioStandsComponent', () => {
  const planId = 456;
  const scenarioId = 123;

  let scenarioConfig$: BehaviorSubject<any>;

  beforeEach(async () => {
    scenarioConfig$ = new BehaviorSubject<any>({}); // no stand_size initially

    await TestBed.configureTestingModule({
      imports: [ScenarioStandsComponent],
      declarations: [
        MockDeclaration(LayerComponent),
        MockDeclaration(VectorSourceComponent),
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { scenarioId, planId } } },
        },
        {
          provide: ScenarioState,
          useValue: { scenarioConfig$ },
        },
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(ScenarioStandsComponent);
    fixture.detectChanges(); // let template init
    return { fixture, component: fixture.componentInstance };
  }

  it('reads planId and scenarioId from route snapshot', () => {
    const { component } = create();
    expect(component.planId).toBe(planId);
    expect(component.scenarioId).toBe(scenarioId);
  });

  it('exposes COLORS and sourceName constants', () => {
    const { component } = create();
    expect((component as any).COLORS).toBe(BASE_COLORS);
    expect(component.sourceName).toBe(
      MARTIN_SOURCES.scenarioStands.sources.stands
    );
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
