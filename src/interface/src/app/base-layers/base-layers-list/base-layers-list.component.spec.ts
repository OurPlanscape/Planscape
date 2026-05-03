// base-layers-list.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { BaseLayersListComponent } from './base-layers-list.component';
import { BaseLayer, MapDataDataSet } from '@types';
import { BaseLayersStateService } from '../base-layers.state.service';
import { DatasetsService } from '@api/datasets/datasets.service';
import { TypeE04Enum, ModuleEnum } from '@api/planscapeAPI.schemas';
import { MockProvider } from 'ng-mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('BaseLayersListComponent', () => {
  let component: BaseLayersListComponent;
  let fixture: ComponentFixture<BaseLayersListComponent>;

  let baseLayersStateServiceMock: jasmine.SpyObj<BaseLayersStateService>;

  const mockDataSet: MapDataDataSet = {
    id: 123,
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLayersListComponent, MatSnackBarModule],
      providers: [
        MockProvider(BaseLayersStateService, {
          loadingLayers$: of([]),
          resetSourceIds: jasmine.createSpy('resetSourceIds'),
        }),
        MockProvider(DatasetsService),
      ],
    }).compileComponents();

    spyOn(
      TestBed.inject(DatasetsService),
      'datasetsBrowsePost'
    ).and.returnValue(of([]) as any);

    baseLayersStateServiceMock = TestBed.inject(
      BaseLayersStateService
    ) as jasmine.SpyObj<BaseLayersStateService>;

    fixture = TestBed.createComponent(BaseLayersListComponent);
    component = fixture.componentInstance;

    component.dataSet = mockDataSet;
    component.allSelectedLayersIds = [];
    component.initialExpanded = false;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit layerSelected when a layer is changed', () => {
    const mockLayer: BaseLayer = {
      id: 1,
      name: 'Watersheds (HUC-12)',
      path: ['DEMO multi'],
    } as any;

    spyOn(component.layerSelected, 'emit');

    component.onLayerChange(mockLayer, false);

    expect(component.layerSelected.emit).toHaveBeenCalledWith({
      layer: mockLayer,
      isMulti: false,
    });
  });

  it('should reset source ids when a single-select layer is changed', () => {
    const mockLayer = { id: 1 } as BaseLayer;

    component.onLayerChange(mockLayer, false);

    expect(baseLayersStateServiceMock.resetSourceIds).toHaveBeenCalled();
  });

  it('should NOT reset source ids when a multi-select layer is changed', () => {
    const mockLayer = { id: 1 } as BaseLayer;

    component.onLayerChange(mockLayer, true);

    expect(baseLayersStateServiceMock.resetSourceIds).not.toHaveBeenCalled();
  });

  it('should correctly detect selected layers', () => {
    component.allSelectedLayersIds = [1, 2, 3];

    expect(component.isSelectedLayer(1)).toBeTrue();
    expect(component.isSelectedLayer(4)).toBeFalse();
  });

  it('noBaseLayers should reflect whether baseLayers is empty', () => {
    component.baseLayers = [];
    expect(component.noBaseLayers).toBeTrue();

    component.baseLayers = [{ id: 1 } as BaseLayer];
    expect(component.noBaseLayers).toBeFalse();
  });

  it('expandDataSet should toggle expanded and load base layers when none loaded', () => {
    const returnedLayers: BaseLayer[] = [
      { id: 10, name: 'Test', path: [] } as any,
    ];

    const datasetsService = TestBed.inject(DatasetsService);
    (datasetsService.datasetsBrowsePost as jasmine.Spy).and.returnValue(
      of(returnedLayers)
    );

    component.baseLayers = [];
    expect(component.noBaseLayers).toBeTrue();

    component.expandDataSet();

    expect(component.expanded).toBeTrue();
    expect(datasetsService.datasetsBrowsePost).toHaveBeenCalledWith(
      mockDataSet.id,
      { type: TypeE04Enum.VECTOR, module: ModuleEnum.map }
    );
    expect(component.baseLayers).toEqual(returnedLayers);
  });

  it('expandDataSet should not call service again if base layers already loaded', () => {
    component.baseLayers = [{ id: 1 } as BaseLayer];
    const datasetsService = TestBed.inject(DatasetsService);

    component.expandDataSet();

    expect(component.expanded).toBeTrue();
    expect(datasetsService.datasetsBrowsePost).not.toHaveBeenCalled();
  });

  it('should honour initialExpanded only on first change', () => {
    const newFixture = TestBed.createComponent(BaseLayersListComponent);
    const instance = newFixture.componentInstance;

    instance.dataSet = mockDataSet;

    // first change (Angular would call this automatically in real app)
    instance.initialExpanded = true;
    instance.ngOnChanges({
      initialExpanded: {
        currentValue: true,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(instance.expanded).toBeTrue();

    // simulate later Input updates (Angular wouldn't override expanded)
    instance.initialExpanded = false;
    instance.ngOnChanges({
      initialExpanded: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(instance.expanded).toBeTrue(); // stays true
  });
});
