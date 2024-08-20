import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapRectangleComponent } from './map-rectangle.component';
import {
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { MockDeclarations } from 'ng-mocks';

describe('MapRectangleComponent', () => {
  let component: MapRectangleComponent;
  let fixture: ComponentFixture<MapRectangleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapRectangleComponent],
      declarations: MockDeclarations(GeoJSONSourceComponent, LayerComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapRectangleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
