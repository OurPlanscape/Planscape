import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBaseDropdownComponent } from './map-base-dropdown.component';

describe('MapBaseDropdownComponent', () => {
  let component: MapBaseDropdownComponent;
  let fixture: ComponentFixture<MapBaseDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseDropdownComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapBaseDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
