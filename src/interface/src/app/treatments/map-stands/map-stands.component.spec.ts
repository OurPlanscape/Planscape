import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStandsComponent } from './map-stands.component';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { TreatmentsState } from '../treatments.state';

describe('MapStandsComponent', () => {
  let component: MapStandsComponent;
  let fixture: ComponentFixture<MapStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsComponent],
      providers: [MockProviders(SelectedStandsState, TreatmentsState)],
      declarations: MockDeclarations(VectorSourceComponent, LayerComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
