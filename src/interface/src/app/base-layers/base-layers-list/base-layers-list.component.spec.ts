import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseLayersListComponent } from './base-layers-list.component';

describe('BaseLayersListComponent', () => {
  let component: BaseLayersListComponent;
  let fixture: ComponentFixture<BaseLayersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLayersListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseLayersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should emit layerSelected when a radio is selected', () => {
    const mockLayer = component.categorizedBaseLayer.layers[0];
    spyOn(component.layerSelected, 'emit');

    component.onLayerChange(mockLayer);

    expect(component.layerSelected.emit).toHaveBeenCalledWith(mockLayer);
  });

  it('should emit layersSelected with layer added when checkbox is checked', () => {
    const mockLayer = component.categorizedBaseLayer.layers[1];
    spyOn(component.layersSelected, 'emit');

    const mockEvent = { target: { checked: true } };
    component.onCheckboxChange(mockLayer, mockEvent);

    expect(component.selectedLayers).toContain(mockLayer);
    expect(component.layersSelected.emit).toHaveBeenCalledWith([mockLayer]);
  });

  it('should emit layersSelected with layer removed when checkbox is unchecked', () => {
    const mockLayer = component.categorizedBaseLayer.layers[2];
    component.selectedLayers = [mockLayer];
    spyOn(component.layersSelected, 'emit');

    const mockEvent = { target: { checked: false } };
    component.onCheckboxChange(mockLayer, mockEvent);

    expect(component.selectedLayers).not.toContain(mockLayer);
    expect(component.layersSelected.emit).toHaveBeenCalledWith([]);
  });

  it('isLayerSelected should return true if layer is in selectedLayers', () => {
    const mockLayer = component.categorizedBaseLayer.layers[0];
    component.selectedLayers = [mockLayer];

    const result = component.isLayerSelected(mockLayer);

    expect(result).toBeTrue();
  });

  it('isLayerSelected should return false if layer is not in selectedLayers', () => {
    const mockLayer = component.categorizedBaseLayer.layers[1];
    component.selectedLayers = [];

    const result = component.isLayerSelected(mockLayer);

    expect(result).toBeFalse();
  });
});
