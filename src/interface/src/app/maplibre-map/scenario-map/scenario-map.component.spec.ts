import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioMapComponent } from './scenario-map.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from '../map-config.state';
import { AuthService, ScenarioService } from '@services';
import { ModuleService } from '@app/services/module.service';
import { ActivatedRoute } from '@angular/router';
import { PlanState } from '@plan/plan.state';
import { Observable, of } from 'rxjs';
import { Scenario } from '@types';
import { DataLayerNameComponent } from '@data-layers/data-layer-name/data-layer-name.component';
import { MapDataLayerComponent } from '@maplibre-map/map-data-layer/map-data-layer.component';
import { MapConfigService } from '../map-config.service';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { BaseLayer } from '@types';

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
        MockProvider(NewScenarioState, {
          currentStep$: of(null),
          scenarioConfig$: of({}),
          selectedSubUnitLayer$: of(null),
          loading$: of(false),
        }),
        MockProviders(
          MapConfigState,
          AuthService,
          MapConfigService,
          ModuleService
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

  it('removes the added sub-unit base layer on destroy so it does not leak to other maps', () => {
    const baseLayersState = TestBed.inject(BaseLayersStateService);
    const removeSpy = spyOn(baseLayersState, 'removeBaseLayer');
    const layer = { id: 42 } as unknown as BaseLayer;

    // simulate the sub-unit layer having been pushed into the app-wide state
    (component as any).addedSubUnitLayer = layer;

    component.ngOnDestroy();

    expect(removeSpy).toHaveBeenCalledWith(layer);
  });
});
