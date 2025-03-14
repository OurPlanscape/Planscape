import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapDataLayerComponent } from './map-data-layer.component';

describe('MapDataLayerComponent', () => {
  let component: MapDataLayerComponent;
  let fixture: ComponentFixture<MapDataLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapDataLayerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapDataLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
