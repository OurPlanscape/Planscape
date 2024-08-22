import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBaseLayerComponent } from './map-base-layer.component';

describe('MapBaseLayerComponent', () => {
  let component: MapBaseLayerComponent;
  let fixture: ComponentFixture<MapBaseLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseLayerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapBaseLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
