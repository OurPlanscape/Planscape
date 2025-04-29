import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseLayersListComponent } from './base-layers-list.component';
import { BaseLayer } from '@types';

describe('BaseLayersListComponent', () => {
  let component: BaseLayersListComponent;
  let fixture: ComponentFixture<BaseLayersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLayersListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseLayersListComponent);
    component = fixture.componentInstance;
    component.categorizedBaseLayer = {
      category: {
        name: 'Demo Category',
        isMultiSelect: false,
      },
      layers: [
        {
          id: 1,
          name: 'Watersheds (HUC-12)',
          path: ['DEMO multi'],
        },
      ] as BaseLayer[],
    };
    fixture.detectChanges();
  });

  it('should emit layerSelected when a radio is selected', () => {
    const mockLayer = {
      id: 1,
      name: 'Watersheds (HUC-12)',
      path: ['DEMO multi'],
    } as BaseLayer;
    spyOn(component.layerSelected, 'emit');

    component.onLayerChange(mockLayer, false);

    expect(component.layerSelected.emit).toHaveBeenCalledWith({
      layer: mockLayer,
      isMulti: false,
    });
  });
});
