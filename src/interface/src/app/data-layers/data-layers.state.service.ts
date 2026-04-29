import { Inject, Injectable } from '@angular/core';
import { DatalayersService } from '@api/datalayers/datalayers.service';
import { DatasetsService } from '@api/datasets/datasets.service';
import {
  BrowseDataLayer,
  TypeE04Enum,
} from '@api/planscapeAPI.schemas';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import {
  BaseDataSet,
  DataLayer,
  DataSet,
  Info,
  Metadata,
  Pagination,
  SearchResult,
  Styles,
} from '@types';
import { buildPathTree } from '@data-layers/data-layers/tree-node';
import { extractLegendInfo } from './utilities';
import { MapModuleService } from '@services/map-module.service';

import { MAX_SELECTED_DATALAYERS } from '@data-layers/data-layers/max-selected-datalayers.token';

import { distinctUntilChanged } from 'rxjs/operators';
import { PlanState } from '@plan/plan.state';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';
import { SNACK_ERROR_CONFIG, UnselectableType } from '@app/shared';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface unselectableLayer {
  id: number;
  reason: UnselectableType;
}

// Converts the generated BrowseDataLayer to the app-wide DataLayer domain type.
// info/metadata/styles are loose JSON-ish on the wire; the hand-written
// Info/Metadata/Styles interfaces describe the specific shape we expect, so
// the cast goes through `unknown` to skip the structural compatibility check.
function toBrowseDataLayer(layer: BrowseDataLayer): DataLayer {
  return {
    id: layer.id,
    organization: layer.organization,
    dataset: layer.dataset,
    path: [...layer.path],
    name: layer.name,
    type: (layer.type as string) ?? '',
    geometry_type: (layer.geometry_type as string) ?? '',
    status: (layer.status as string) ?? '',
    info: layer.info as unknown as Info,
    metadata: (layer.metadata as unknown as Metadata) ?? null,
    styles: layer.styles as unknown as Styles[],
    map_service_type: layer.map_service_type as DataLayer['map_service_type'],
  };
}

@Injectable()
export class DataLayersStateService {
  readonly limit = 20;

  dataSets$ = this.mapModuleService.datasets$.pipe(
    distinctUntilChanged(),
    map((mapData) => mapData.main_datasets),
    tap(() => queueMicrotask(() => this.loadingSubject.next(false)))
  );

  private _selectedDataSet$ = new BehaviorSubject<BaseDataSet | null>(null);
  selectedDataSet$ = this._selectedDataSet$.asObservable().pipe(shareReplay(1));

  // Datalayers applied to the map
  private _viewedDataLayer$ = new BehaviorSubject<DataLayer | null>(null);
  viewedDataLayer$ = this._viewedDataLayer$.asObservable();

  // Datalayers selected from the list of layers
  private _selectedDataLayers$ = new BehaviorSubject<DataLayer[] | []>([]);
  selectedDataLayers$ = this._selectedDataLayers$.asObservable();

  // Datalayers selected from the list of layers
  private _unSelectableDataLayerIds$ = new BehaviorSubject<
    unselectableLayer[] | []
  >([]);

  // Selected datalayers count
  selectedLayersCount$ = this.selectedDataLayers$.pipe(
    map((items) => items.length)
  );

  hasSelectedDatalayers$ = this.selectedDataLayers$.pipe(
    map((items) => items.length > 0)
  );

  canSelectMoreDatalayers$ = this.selectedDataLayers$.pipe(
    map((items) => items.length < this.maxSelectedDatalayers)
  );

  dataLayerWithUrl$ = this.viewedDataLayer$.pipe(
    switchMap((layer) => {
      if (!layer) {
        return of(null);
      }
      return this.datalayersService
        .datalayersUrlsRetrieve(layer.id)
        .pipe(map((d) => ({ layer, url: d.layer_url })));
    })
  );

  dataTree$ = combineLatest([
    this.selectedDataSet$,
    // Setting an initial value when there is no plan
    this.planState.planningAreaGeometry$.pipe(startWith(undefined)),
  ]).pipe(
    tap(() => this.loadingSubject.next(true)),
    switchMap(([dataset, planningAreaGeometry]) => {
      if (!dataset) {
        this.loadingSubject.next(false);
        return of(null);
      }
      const geometry = this.sendGeometry ? planningAreaGeometry : undefined;
      return this.datasetsService
        .datasetsBrowsePost(dataset.id, {
          type: TypeE04Enum.RASTER,
          module: this.mapModuleService.moduleName,
          ...(geometry ? { geometry } : {}),
        })
        .pipe(
          map((items) => buildPathTree(items.map(toBrowseDataLayer))),
          tap((s) => this.loadingSubject.next(false)),
          catchError((e) => {
            this.loadingSubject.next(false);
            this._selectedDataSet$.next(null);
            this.matSnackBar.open(
              `Error: Could not load layers for ${dataset.name}`,
              'Dismiss',
              SNACK_ERROR_CONFIG
            );
            return of(null);
          })
        );
    }),
    shareReplay(1)
  );

  hasNoTreeData$ = this.dataTree$.pipe(map((d) => !!d && d.length === 0));

  private loadingLayer = new BehaviorSubject(false);
  loadingLayer$ = this.loadingLayer.asObservable();

  private loadingSubject = new BehaviorSubject(true);
  loading$ = this.loadingSubject.asObservable();

  private _offset = new BehaviorSubject(0);

  private _searchTerm$ = new BehaviorSubject<string>('');
  searchTerm$ = this._searchTerm$.asObservable();

  colorLegendInfo$ = this.viewedDataLayer$.pipe(
    map((currentLayer: DataLayer | null) => {
      if (currentLayer) {
        return extractLegendInfo(currentLayer);
      } else {
        return null;
      }
    })
  );

  searchResults$: Observable<Pagination<SearchResult> | null> = combineLatest([
    this.searchTerm$,
    this._offset,
    // Setting an initial value when there is no plan
    this.planState.planningAreaGeometry$.pipe(startWith(undefined)),
  ]).pipe(
    tap(() => this.loadingSubject.next(true)),
    switchMap(([term, offset, planningAreaGeometry]) => {
      if (!term) {
        return of(null);
      }

      const module = this.mapModuleService.moduleName;
      const geometry = this.sendGeometry ? planningAreaGeometry : undefined;

      return this.datalayersService
        .datalayersFindAnythingCreate(
          {
            term,
            type: TypeE04Enum.RASTER,
            ...(module ? { module } : {}),
            ...(geometry ? { geometry } : {}),
          },
          { limit: this.limit, ...(offset ? { offset } : {}) }
        )
        .pipe(
          map((results) => results as unknown as Pagination<SearchResult>),
          startWith(null),
          map((results) => {
            if (results) {
              this.loadingSubject.next(false);
              return results;
            }
            return null;
          })
        );
    }),
    shareReplay(1)
  );

  private _paths$ = new BehaviorSubject<string[]>([]);
  paths$ = this._paths$.asObservable();

  private _isBrowsing$ = new BehaviorSubject(true);
  isBrowsing$ = this._isBrowsing$.asObservable();

  constructor(
    private datalayersService: DatalayersService,
    private datasetsService: DatasetsService,
    private mapModuleService: MapModuleService,
    @Inject(MAX_SELECTED_DATALAYERS)
    private maxSelectedDatalayers: number,
    @Inject(USE_GEOMETRY)
    private readonly sendGeometry: boolean,
    private planState: PlanState,
    private matSnackBar: MatSnackBar
  ) {}

  selectDataSet(dataset: BaseDataSet) {
    this._isBrowsing$.next(true);
    this._selectedDataSet$.next(dataset);
    this.loadingSubject.next(true);
  }

  goBackToSearchResults() {
    this._selectedDataSet$.next(null);
    // if I go back but im not searching
    if (this._searchTerm$.value) {
      this._isBrowsing$.next(false);
    }
  }

  selectDataLayer(dataLayer: DataLayer) {
    this.setDataLayerLoading(true);
    this._viewedDataLayer$.next(dataLayer);
  }

  setDataLayerLoading(status: boolean) {
    this.loadingLayer.next(status);
  }

  clearViewedDataLayer() {
    this._viewedDataLayer$.next(null);
  }

  reloadDataLayerUrl() {
    const currentLayer = this._viewedDataLayer$.value;
    this._viewedDataLayer$.next(currentLayer);
  }

  search(term: string) {
    if (this._offset.value > 0) {
      this._offset.next(0);
    }
    this._searchTerm$.next(term);
    this._isBrowsing$.next(!term);
  }

  changePage(page: number) {
    this._offset.next((page - 1) * this.limit);
  }

  clearSearch() {
    this.search('');
    this._selectedDataSet$.next(null);
  }

  goToSelectedLayer(layer: DataLayer) {
    // Reset search
    this._searchTerm$.next('');
    this._offset.next(0);
    this.goToDataLayerCategory(layer);
  }

  goToDataLayerCategory(layer: DataLayer) {
    this._isBrowsing$.next(true);
    this.loadingSubject.next(false);
    // needs to select the dataset if it's not the same as the one selected already
    if (this._selectedDataSet$.value?.id !== layer.dataset.id) {
      const dataSet: Partial<DataSet> = {
        ...layer.dataset,
        organization: layer.organization,
      };
      // reset previous results
      this._selectedDataSet$.next(null);
      // select the new data set
      this.selectDataSet(dataSet as DataSet);
    }
    this._paths$.next(layer.path);
  }

  resetPath() {
    this._paths$.next([]);
  }

  resetAll() {
    this.resetPath();
    this.clearViewedDataLayer();
    this.clearSearch();
  }

  // Checking if the layer is already in the selected list
  isSelectedLayer(layer: DataLayer) {
    return this._selectedDataLayers$.value.some((l) => l.id === layer.id);
  }

  // Remove a layer from the selected list
  removeSelectedLayer(layer: DataLayer) {
    const updatedSelectedDatalayers = this._selectedDataLayers$.value.filter(
      (l) => l.id !== layer.id
    );
    this._selectedDataLayers$.next(updatedSelectedDatalayers);
  }

  //manage collection of layers that can't be selected
  setUnselectableLayers(layerIds: number[], reason: UnselectableType) {
    const unselectableLayers = layerIds.map((layerId) => {
      return { id: layerId, reason: reason };
    });
    this._unSelectableDataLayerIds$.next(unselectableLayers);
  }

  clearUnselectableLayers() {
    this._unSelectableDataLayerIds$.next([]);
  }

  isLayerUnselectable(layer: DataLayer) {
    const unselectableLayers: unselectableLayer[] =
      this._unSelectableDataLayerIds$.value ?? [];
    return unselectableLayers.some((ul) => ul.id === layer.id);
  }

  getUnselectableLayer(layer: DataLayer): unselectableLayer | undefined {
    const unselectableLayers: unselectableLayer[] =
      this._unSelectableDataLayerIds$.value ?? [];
    return unselectableLayers.find((ul) => ul.id === layer.id);
  }

  // Adding or removing an item to the selected list
  toggleLayerAdition(layer: DataLayer) {
    if (this.isSelectedLayer(layer)) {
      this.removeSelectedLayer(layer);
    } else if (
      this._selectedDataLayers$.value.length < this.maxSelectedDatalayers &&
      !this.isLayerUnselectable(layer)
    ) {
      this._selectedDataLayers$.next([
        ...this._selectedDataLayers$.value,
        layer,
      ]);
    }
  }

  // Setting the list of selected list
  updateSelectedLayers(layers: DataLayer[]) {
    this._selectedDataLayers$.next(layers);
  }

  // Return the max number of selected layers for this instance of the service
  getMaxSelectedLayers(): number {
    return this.maxSelectedDatalayers;
  }

  setMaxSelectedLayers(max: number): void {
    this.maxSelectedDatalayers = max;
  }
}
