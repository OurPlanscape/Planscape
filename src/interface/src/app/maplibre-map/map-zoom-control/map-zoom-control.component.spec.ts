import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapZoomControlComponent } from './map-zoom-control.component';

describe('MapZoomControlComponent', () => {
  let component: MapZoomControlComponent;
  let fixture: ComponentFixture<MapZoomControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapZoomControlComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapZoomControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
