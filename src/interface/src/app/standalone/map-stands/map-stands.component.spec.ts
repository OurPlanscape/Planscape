import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStandsComponent } from './map-stands.component';

describe('MapStandsComponent', () => {
  let component: MapStandsComponent;
  let fixture: ComponentFixture<MapStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
