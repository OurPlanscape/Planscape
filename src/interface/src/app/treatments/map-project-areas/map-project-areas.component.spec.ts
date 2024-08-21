import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapProjectAreasComponent } from './map-project-areas.component';

describe('MapProjectAreasComponent', () => {
  let component: MapProjectAreasComponent;
  let fixture: ComponentFixture<MapProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapProjectAreasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapProjectAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
