import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBaseLayersComponent } from './map-base-layers.component';

describe('MapBaseLayersComponent', () => {
  let component: MapBaseLayersComponent;
  let fixture: ComponentFixture<MapBaseLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseLayersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapBaseLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
