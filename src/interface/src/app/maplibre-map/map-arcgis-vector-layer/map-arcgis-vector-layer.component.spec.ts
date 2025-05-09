import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapArcgisVectorLayerComponent } from './map-arcgis-vector-layer.component';

describe('MapArcgisVectorLayerComponent', () => {
  let component: MapArcgisVectorLayerComponent;
  let fixture: ComponentFixture<MapArcgisVectorLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapArcgisVectorLayerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapArcgisVectorLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
