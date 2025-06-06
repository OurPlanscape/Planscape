import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapDrawingToolboxComponent } from './map-drawing-toolbox.component';

describe('MapDrawingToolboxComponent', () => {
  let component: MapDrawingToolboxComponent;
  let fixture: ComponentFixture<MapDrawingToolboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapDrawingToolboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDrawingToolboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
