import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapNavbarComponent } from './map-nav-bar.component';

describe('MapNavbarComponent', () => {
  let component: MapNavbarComponent;
  let fixture: ComponentFixture<MapNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapNavbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
