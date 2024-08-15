import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStandsComponent } from './map-stands.component';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { MockDeclarations } from 'ng-mocks';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

describe('MapStandsComponent', () => {
  let component: MapStandsComponent;
  let fixture: ComponentFixture<MapStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsComponent],
      providers: [SelectedStandsState],
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
