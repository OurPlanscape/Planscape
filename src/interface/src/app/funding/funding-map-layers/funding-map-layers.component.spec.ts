import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import {
  FundingMapLayersComponent,
  MapLayer,
} from './funding-map-layers.component';

describe('FundingMapLayersComponent', () => {
  let component: FundingMapLayersComponent;
  let fixture: ComponentFixture<FundingMapLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingMapLayersComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingMapLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the selected layer', () => {
    const layer: MapLayer = { id: 1, name: 'Layer A' };
    const emitted: MapLayer[] = [];
    component.selectedLayer.subscribe((l) => emitted.push(l));

    component.selectedLayer.emit(layer);

    expect(emitted).toEqual([layer]);
  });
});
