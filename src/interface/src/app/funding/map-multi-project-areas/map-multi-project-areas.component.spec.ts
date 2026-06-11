import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapMultiProjectAreasComponent } from './map-multi-project-areas.component';

describe('MapMultiProjectAreasComponent', () => {
  let component: MapMultiProjectAreasComponent;
  let fixture: ComponentFixture<MapMultiProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapMultiProjectAreasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapMultiProjectAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
