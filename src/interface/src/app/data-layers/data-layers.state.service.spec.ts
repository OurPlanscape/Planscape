import { TestBed } from '@angular/core/testing';

import { DataLayersStateService } from './data-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { DataLayersService } from '@services/data-layers.service';
import { of, throwError } from 'rxjs';
import { DataLayer, DataSet, Pagination } from '@types';
import { MapModuleService } from '@services/map-module.service';
import { FeaturesModule } from '@features/features.module';
import { overrideFeatureFlags } from '@features/testing';
import { PlanState } from '@plan/plan.state';
import { MOCK_GEOMETRY, MOCK_PLAN } from '@services/mocks';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAX_SELECTED_DATALAYERS } from '@data-layers/data-layers/max-selected-datalayers.token';
import { SELECTION_MODE } from '@data-layers/data-layers/selection-mode.token';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';
import { TreeNode } from '@data-layers/data-layers/tree-node';
import { WorkspacesService } from '@services/workspaces.service';
import { WorkspaceState } from '@app/workspaces/workspace.state';

describe('DataLayersStateService', () => {
  let service: DataLayersStateService;
  let dataLayersService: jasmine.SpyObj<DataLayersService>;
  let workspacesService: jasmine.SpyObj<WorkspacesService>;
  let currentWorkspaceId: number | null;

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

    currentWorkspaceId = null;
    workspacesService = jasmine.createSpyObj<WorkspacesService>(
      'WorkspacesService',
      ['favoriteDataLayer', 'unfavoriteDataLayer']
    );
    workspacesService.favoriteDataLayer.and.returnValue(of({}));
    workspacesService.unfavoriteDataLayer.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      imports: [FeaturesModule, MatSnackBarModule, NoopAnimationsModule],
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
        { provide: WorkspacesService, useValue: workspacesService },
        {
          provide: WorkspaceState,
          useValue: {
            get currentWorkspaceIdValue() {
              return currentWorkspaceId;
            },
          },
        },
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
      undefined,
      null
    );
    expect(dataLayersService.listCategoryDataLayers).not.toHaveBeenCalled();
  });

  it('browses a category through the category endpoint', () => {
    createService('DATA_ORGANIZATION');
    service.selectCategory({ id: 20, name: 'Fire', icon: null });
    expect(dataLayersService.listCategoryDataLayers).toHaveBeenCalledWith(
      20,
      'map',
      undefined,
      null
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
        undefined,
        null
      );
    });

    it("opens the layer's first category with DATA_ORGANIZATION on", () => {
      createService('DATA_ORGANIZATION');
      service.goToDataLayerCategory(layer);
      expect(dataLayersService.listCategoryDataLayers).toHaveBeenCalledWith(
        20,
        'map',
        undefined,
        null
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
        undefined,
        null
      );
    });
  });

  describe('restoreDataLayer', () => {
    const stale = { ...layer, simple_categories: undefined } as DataLayer;

    it('views and browses a current copy as is', () => {
      createService('DATA_ORGANIZATION');
      service.restoreDataLayer(layer);
      expect(dataLayersService.listDataLayers).not.toHaveBeenCalled();
      expect(dataLayersService.listCategoryDataLayers).toHaveBeenCalledWith(
        20,
        'map',
        undefined,
        null
      );
    });

    it('refreshes a copy saved without categories', () => {
      createService('DATA_ORGANIZATION');
      dataLayersService.listDataLayers.and.returnValue(of([layer]));
      let viewed = null as DataLayer | null;
      service.viewedDataLayer$.subscribe((l) => (viewed = l));

      service.restoreDataLayer(stale);

      expect(dataLayersService.listDataLayers).toHaveBeenCalledWith(10, 'map');
      expect(viewed).toBe(layer);
      expect(dataLayersService.listCategoryDataLayers).toHaveBeenCalledWith(
        20,
        'map',
        undefined,
        null
      );
    });

    it('keeps the stored copy when the layer is no longer listed', () => {
      createService('DATA_ORGANIZATION');
      let viewed = null as DataLayer | null;
      service.viewedDataLayer$.subscribe((l) => (viewed = l));

      service.restoreDataLayer(stale);
      expect(viewed).toBe(stale);
    });

    it("doesn't refresh with DATA_ORGANIZATION off", () => {
      createService();
      service.restoreDataLayer(stale);
      expect(dataLayersService.listDataLayers).toHaveBeenCalledOnceWith(
        10,
        'map',
        undefined,
        null
      );
    });
  });

  describe('favorites', () => {
    const favorited = { ...layer, id: 2, is_favorite: true } as DataLayer;
    const notFavorited = { ...layer, id: 3, is_favorite: false } as DataLayer;
    const noFlag = { ...layer, id: 4 } as DataLayer;

    function isFavorite(l: DataLayer): boolean {
      let value = false;
      service
        .isFavorite$(l)
        .subscribe((v) => (value = v))
        .unsubscribe();
      return value;
    }

    /** Inside a workspace, with the redesign on, which is when stars show. */
    function createInWorkspace(...flags: string[]) {
      currentWorkspaceId = 7;
      createService(...flags);
    }

    it('follows the payload for a layer nobody touched', () => {
      createInWorkspace('DATA_ORGANIZATION');

      expect(isFavorite(favorited)).toBe(true);
      expect(isFavorite(notFavorited)).toBe(false);
      // null, which is what the backend sends when no workspace was asked for
      expect(isFavorite(noFlag)).toBe(false);
    });

    it('favorites a layer in the workspace', () => {
      createInWorkspace('DATA_ORGANIZATION');

      service.toggleFavorite(notFavorited);

      expect(workspacesService.favoriteDataLayer).toHaveBeenCalledWith(7, 3);
      expect(isFavorite(notFavorited)).toBe(true);
    });

    it('unfavorites a layer the payload reported as a favorite', () => {
      createInWorkspace('DATA_ORGANIZATION');

      service.toggleFavorite(favorited);

      expect(workspacesService.unfavoriteDataLayer).toHaveBeenCalledWith(7, 2);
      expect(isFavorite(favorited)).toBe(false);
    });

    it('agrees about the same layer wherever it shows up', () => {
      createInWorkspace('DATA_ORGANIZATION');
      // the tree and the search results hand over different objects
      const inTree = { ...notFavorited } as DataLayer;
      const inSearch = { ...notFavorited } as DataLayer;

      service.toggleFavorite(inTree);

      expect(isFavorite(inSearch)).toBe(true);
    });

    it('puts the star back and warns when favoriting fails', () => {
      createInWorkspace('DATA_ORGANIZATION');
      const toast = spyOn(TestBed.inject(MatSnackBar), 'open');
      workspacesService.favoriteDataLayer.and.returnValue(
        throwError(() => new Error('nope'))
      );

      service.toggleFavorite(notFavorited);

      expect(isFavorite(notFavorited)).toBe(false);
      expect(toast).toHaveBeenCalled();
    });

    it('puts the star back and warns when unfavoriting fails', () => {
      createInWorkspace('DATA_ORGANIZATION');
      const toast = spyOn(TestBed.inject(MatSnackBar), 'open');
      workspacesService.unfavoriteDataLayer.and.returnValue(
        throwError(() => new Error('nope'))
      );

      service.toggleFavorite(favorited);

      expect(isFavorite(favorited)).toBe(true);
      expect(toast).toHaveBeenCalled();
    });

    it('asks the browse endpoints about the workspace', () => {
      createInWorkspace('DATA_ORGANIZATION');

      service.selectDataSet({
        id: 10,
        name: 'Dataset',
        organization: layer.organization,
      });

      expect(dataLayersService.listDataLayers).toHaveBeenCalledWith(
        10,
        'map',
        undefined,
        7
      );
    });

    it('offers no favoriting with the feature off', () => {
      createInWorkspace();

      expect(service.favoritesEnabled()).toBe(false);

      service.toggleFavorite(notFavorited);

      expect(workspacesService.favoriteDataLayer).not.toHaveBeenCalled();
      expect(isFavorite(notFavorited)).toBe(false);
    });

    it('leaves the browse calls alone with the feature off', () => {
      createInWorkspace();

      service.selectDataSet({
        id: 10,
        name: 'Dataset',
        organization: layer.organization,
      });

      expect(dataLayersService.listDataLayers).toHaveBeenCalledWith(
        10,
        'map',
        undefined,
        null
      );
    });

    it('offers no favoriting outside a workspace', () => {
      currentWorkspaceId = null;
      createService('DATA_ORGANIZATION');

      expect(service.favoritesEnabled()).toBe(false);

      service.toggleFavorite(notFavorited);

      expect(workspacesService.favoriteDataLayer).not.toHaveBeenCalled();
    });
  });
});
