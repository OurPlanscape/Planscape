import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioMapComponent } from '@app/maplibre-map/scenario-map/scenario-map.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { AuthService, ScenarioService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { PlanState } from '@app/plan/plan.state';
import { Observable, of } from 'rxjs';
import { Scenario } from '@types';
import { DataLayerNameComponent } from '@app/data-layers/data-layer-name/data-layer-name.component';
import { MapDataLayerComponent } from '@app/maplibre-map/map-data-layer/map-data-layer.component';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';

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
        }),
        MockProviders(
          MapConfigState,
          AuthService,
          MapConfigService,
          NewScenarioState
        ),
      ],
      declarations: [
        MockDeclarations(DataLayerNameComponent, MapDataLayerComponent),
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
