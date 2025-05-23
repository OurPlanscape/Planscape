import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioMapComponent } from './scenario-map.component';
import { MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { AuthService, ScenarioService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { PlanState } from '../../plan/plan.state';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Scenario } from '@types';

describe('ScenarioMapComponent', () => {
  let component: ScenarioMapComponent;
  let fixture: ComponentFixture<ScenarioMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioMapComponent],
      providers: [
        MockProvider(PlanState, {
          planningAreaGeometry$: of({} as any),
        }),
        MockProvider(ActivatedRoute, {
          children: [],
        }),
        MockProvider(ScenarioService, {
          getScenario: (): Observable<Scenario> =>
            of({
              scenario_result: {
                result: {
                  features: [] as any,
                },
              },
            } as Scenario),
          getExcludedAreas: () => new BehaviorSubject([]),
        }),
        MockProviders(MapConfigState, AuthService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
