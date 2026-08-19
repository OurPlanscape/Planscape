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

  it('emits the layer when its toggle is switched on', () => {
    const layer: MapLayer = { id: 1, name: 'Layer A' };
    const selected: MapLayer[] = [];
    const cleared: MapLayer[] = [];
    component.selectedLayer.subscribe((l) => selected.push(l));
    component.clearedLayer.subscribe((l) => cleared.push(l));

    component.onToggled(layer, true);

    expect(selected).toEqual([layer]);
    expect(cleared).toEqual([]);
  });

  it('emits the layer on `clearedLayer` when its toggle is switched off', () => {
    const layer: MapLayer = { id: 1, name: 'Layer A' };
    const selected: MapLayer[] = [];
    const cleared: MapLayer[] = [];
    component.selectedLayer.subscribe((l) => selected.push(l));
    component.clearedLayer.subscribe((l) => cleared.push(l));

    component.onToggled(layer, false);

    expect(cleared).toEqual([layer]);
    expect(selected).toEqual([]);
  });

  it('shows a placeholder instead of the list while loading', () => {
    component.layers = [{ id: 1, name: 'Layer A' }];
    component.loading = true;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.layers-loading')).toBeTruthy();
    expect(el.querySelector('sg-toggle')).toBeNull();

    component.loading = false;
    fixture.detectChanges();

    expect(el.querySelector('.layers-loading')).toBeNull();
    expect(el.querySelector('sg-toggle')).toBeTruthy();
  });

  it('shows the checkbox list once loaded in multi-select', () => {
    component.multiSelect = true;
    component.layers = [{ id: 1, name: 'Layer A' }];
    component.loading = true;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('mat-checkbox')).toBeNull();

    component.loading = false;
    fixture.detectChanges();

    expect(el.querySelector('mat-checkbox')).toBeTruthy();
  });

  it('marks only the layer matching `selectedLayerId` as selected', () => {
    const layerA: MapLayer = { id: 1, name: 'Layer A' };
    const layerB: MapLayer = { id: 2, name: 'Layer B' };
    component.layers = [layerA, layerB];
    component.selectedLayerId = 2;

    expect(component.isSelected(layerA)).toBe(false);
    expect(component.isSelected(layerB)).toBe(true);

    // The active layer lives in another section: nothing here is on.
    component.selectedLayerId = 99;
    expect(component.isSelected(layerA)).toBe(false);
    expect(component.isSelected(layerB)).toBe(false);
  });
});
