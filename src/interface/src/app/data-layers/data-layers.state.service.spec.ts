import { TestBed } from '@angular/core/testing';

import { DataLayersStateService } from './data-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { DataLayersService } from '@services/data-layers.service';
import { of } from 'rxjs';
import { DataLayer, DataSet, Pagination } from '@types';
import { MapModuleService } from '@services/map-module.service';
import { FeaturesModule } from '@features/features.module';
import { overrideFeatureFlags } from '@features/testing';
import { PlanState } from '@plan/plan.state';
import { MOCK_GEOMETRY, MOCK_PLAN } from '@services/mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAX_SELECTED_DATALAYERS } from '@data-layers/data-layers/max-selected-datalayers.token';
import { SELECTION_MODE } from '@data-layers/data-layers/selection-mode.token';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';
import { TreeNode } from '@data-layers/data-layers/tree-node';

describe('DataLayersStateService', () => {
  let service: DataLayersStateService;
  let dataLayersService: jasmine.SpyObj<DataLayersService>;

  const layer = {
    id: 1,
    name: 'Layer',
    organization: { id: 5, name: 'Org' },
    dataset: { id: 10, name: 'Dataset' },
    simple_categories: [
      { id: 20, name: 'Fire', icon: null },
      { id: 21, name: 'Water', icon: null },
    ],
    path: ['a', 'b'],
  } as DataLayer;

  beforeEach(() => {
    dataLayersService = jasmine.createSpyObj<DataLayersService>(
      'DataLayersService',
      ['listDataSets', 'listDataLayers', 'listCategoryDataLayers']
    );
    dataLayersService.listDataSets.and.returnValue(
      of({} as Pagination<DataSet>)
    );
    dataLayersService.listDataLayers.and.returnValue(of([]));
    dataLayersService.listCategoryDataLayers.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [FeaturesModule, MatSnackBarModule],
      providers: [
        { provide: DataLayersService, useValue: dataLayersService },
        DataLayersStateService,
        { provide: MAX_SELECTED_DATALAYERS, useValue: 1 },
        { provide: SELECTION_MODE, useValue: 'AUTOMATIC' },
        { provide: USE_GEOMETRY, useValue: false },
        MockProvider(MapModuleService, {
          moduleName: 'map',
          datasets$: of({
            main_datasets: [],
            base_datasets: [],
            categories: [],
          }),
        }),
        MockProvider(PlanState, {
          currentPlan$: of(MOCK_PLAN),
          currentPlanId$: of(123),
          planningAreaGeometry$: of(MOCK_GEOMETRY),
        }),
      ],
    });
  });

  function createService(...flags: string[]) {
    overrideFeatureFlags(...flags);
    service = TestBed.inject(DataLayersStateService);
    service.dataTree$.subscribe();
  }

  it('should be created', () => {
    createService();
    expect(service).toBeTruthy();
  });

  it('browses a dataset through the dataset endpoint', () => {
    createService();
    service.selectDataSet({
      id: 10,
      name: 'Dataset',
      organization: layer.organization,
    });
    expect(dataLayersService.listDataLayers).toHaveBeenCalledWith(
      10,
      'map',
      undefined
    );
    expect(dataLayersService.listCategoryDataLayers).not.toHaveBeenCalled();
  });

  it('browses a category through the category endpoint', () => {
    createService('DATA_ORGANIZATION');
    service.selectCategory({ id: 20, name: 'Fire', icon: null });
    expect(dataLayersService.listCategoryDataLayers).toHaveBeenCalledWith(
      20,
      'map',
      undefined
    );
    expect(dataLayersService.listDataLayers).not.toHaveBeenCalled();
  });

  it('lists category layers flat instead of nesting them by path', () => {
    dataLayersService.listCategoryDataLayers.and.returnValue(of([layer]));
    createService('DATA_ORGANIZATION');
    let tree: TreeNode[] | null = null;
    service.dataTree$.subscribe((t) => (tree = t));

    service.selectCategory({ id: 20, name: 'Fire', icon: null });

    expect(tree!).toEqual([{ name: 'Layer', item: layer }]);
  });

  describe('goToDataLayerCategory', () => {
    it("opens the layer's dataset with DATA_ORGANIZATION off", () => {
      createService();
      service.goToDataLayerCategory(layer);
      expect(dataLayersService.listDataLayers).toHaveBeenCalledWith(
        10,
        'map',
        undefined
      );
    });

    it("opens the layer's first category with DATA_ORGANIZATION on", () => {
      createService('DATA_ORGANIZATION');
      service.goToDataLayerCategory(layer);
      expect(dataLayersService.listCategoryDataLayers).toHaveBeenCalledWith(
        20,
        'map',
        undefined
      );
    });

    it('stays in the current category when the layer belongs to it', () => {
      createService('DATA_ORGANIZATION');
      service.selectCategory({ id: 21, name: 'Water', icon: null });
      dataLayersService.listCategoryDataLayers.calls.reset();

      service.goToDataLayerCategory(layer);
      expect(dataLayersService.listCategoryDataLayers).not.toHaveBeenCalled();
    });

    it('falls back to the dataset when the layer has no categories', () => {
      createService('DATA_ORGANIZATION');
      service.goToDataLayerCategory({ ...layer, simple_categories: [] });
      expect(dataLayersService.listDataLayers).toHaveBeenCalledWith(
        10,
        'map',
        undefined
      );
    });
  });
});
