import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStandsComponent } from './map-stands.component';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import {
  ImageComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
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
          showTreatmentStandsLayer$: of(false),
          treatedStandsOpacity$: of(1),
        }),
      ],
      declarations: MockDeclarations(
        VectorSourceComponent,
        LayerComponent,
        ImageComponent
      ),
    }).compileComponents();

    fixture = TestBed.createComponent(MapStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
