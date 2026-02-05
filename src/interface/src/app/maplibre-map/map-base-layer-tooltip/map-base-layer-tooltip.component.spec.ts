import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBaseLayerTooltipComponent } from '@app/maplibre-map/map-base-layer-tooltip/map-base-layer-tooltip.component';

describe('MapBaseLayerTooltipComponent', () => {
  let component: MapBaseLayerTooltipComponent;
  let fixture: ComponentFixture<MapBaseLayerTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseLayerTooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBaseLayerTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
