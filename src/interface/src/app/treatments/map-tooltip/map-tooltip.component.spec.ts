import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapTooltipComponent } from './map-tooltip.component';
import { MockDeclarations } from 'ng-mocks';
import { PopupComponent } from '@maplibre/ngx-maplibre-gl';

describe('MapTooltipComponent', () => {
  let component: MapTooltipComponent;
  let fixture: ComponentFixture<MapTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapTooltipComponent],
      declarations: [MockDeclarations(PopupComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
