import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStandsComponent } from '@app/treatments/map-stands/map-stands.component';
import { SelectedStandsState } from '@app/treatments/treatment-map/selected-stands.state';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import {
  ImageComponent,
  LayerComponent,
  MapComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { TreatedStandsState } from '@app/treatments/treatment-map/treated-stands.state';
import { of } from 'rxjs';

describe('MapStandsComponent', () => {
  let component: MapStandsComponent;
  let fixture: ComponentFixture<MapStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsComponent],
      providers: [
        MockProvider(TreatmentsState, {
          projectAreaId$: of(undefined),
        }),
        MockProvider(SelectedStandsState, {
          selectedStands$: of([]),
        }),
        MockProvider(TreatedStandsState, {
          treatedStands$: of([]),
        }),
        MockProvider(MapConfigState, {
          treatedStandsOpacity$: of(1),
        }),
      ],
      declarations: MockDeclarations(
        VectorSourceComponent,
        LayerComponent,
        ImageComponent,
        MapComponent
      ),
    }).compileComponents();

    fixture = TestBed.createComponent(MapStandsComponent);
    component = fixture.componentInstance;
    component.mapLibreMap = {
      on: () => {},
      off: () => {},
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
