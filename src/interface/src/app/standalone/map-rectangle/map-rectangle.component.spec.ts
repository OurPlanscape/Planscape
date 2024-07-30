import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapRectangleComponent } from './map-rectangle.component';

describe('MapRectangleComponent', () => {
  let component: MapRectangleComponent;
  let fixture: ComponentFixture<MapRectangleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapRectangleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapRectangleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
