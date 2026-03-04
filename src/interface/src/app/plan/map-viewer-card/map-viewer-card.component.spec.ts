import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapViewerCardComponent } from './map-viewer-card.component';

describe('MapViewerCardComponent', () => {
  let component: MapViewerCardComponent;
  let fixture: ComponentFixture<MapViewerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapViewerCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapViewerCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
