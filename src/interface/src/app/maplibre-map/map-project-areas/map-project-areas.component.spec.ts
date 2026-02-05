import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapProjectAreasComponent } from '@app/maplibre-map/map-project-areas/map-project-areas.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { RouterTestingModule } from '@angular/router/testing';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { BehaviorSubject, of } from 'rxjs';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { ScenarioState } from '@app/scenario/scenario.state';

describe('MapProjectAreasComponent', () => {
  let component: MapProjectAreasComponent;
  let fixture: ComponentFixture<MapProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapProjectAreasComponent, RouterTestingModule],
      providers: [
        MockProvider(TreatmentsState),
        MockProvider(MapConfigState, {
          opacity$: of(0.5),
          zoomLevel$: new BehaviorSubject<number>(7),
        }),
        MockProvider(ScenarioState, {
          currentScenarioId$: new BehaviorSubject(1),
        }),
      ],
      declarations: MockDeclarations(VectorSourceComponent, LayerComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapProjectAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
