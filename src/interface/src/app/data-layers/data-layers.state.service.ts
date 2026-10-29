import { Inject, Injectable } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import {
  BaseDataSet,
  DataLayer,
  IdNamePair,
  Pagination,
  Plan,
  Resource,
  SearchResult,
  SimpleCategory,
} from '@types';
import {
  buildFlatTree,
  buildPathTree,
} from '@data-layers/data-layers/tree-node';
import { extractLegendInfo } from './utilities';
import { MapModuleService } from '@services/map-module.service';

import { MAX_SELECTED_DATALAYERS } from '@data-layers/data-layers/max-selected-datalayers.token';
import { PlanState } from '@plan/plan.state';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';
import {
  SNACK_BOTTOM_NOTICE_CONFIG,
  SNACK_ERROR_CONFIG,
  UnselectableType,
} from '@app/shared';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FeatureService } from '@features/feature.service';
import { WorkspacesService } from '@services/workspaces.service';
import { WorkspaceState } from '@app/workspaces/workspace.state';
import { Geometry } from 'geojson';

/** The dataset or category whose layers are being browsed. */
export interface BrowseSelection {
  type: 'dataset' | 'category';
  id: number;
  name: string;
  organization?: IdNamePair;
}

export interface unselectableLayer {
  id: number;
  reason: UnselectableType;
}

@Injectable()
export class DataLayersStateService {
  readonly limit = 20;

  private moduleNameOverride$ = new BehaviorSubject<string | null>(null);

  private baseDataSets$ = this.mapModuleService.datasets$.pipe(
    map((d) => d.main_datasets)
  );

  /** The map module failed to load, so there are no datasets or categories to browse. */
  loadError$ = this.mapModuleService.loadError$;

  dataSets$ = this.moduleNameOverride$.pipe(
    switchMap((name) =>
      name ? this.mapModuleService.datasetsFor(name) : this.baseDataSets$
    ),
    tap(() => queueMicrotask(() => this.loadingSubject.next(false)))
  );

  retryLoad() {
    this.mapModuleService.retryLoadMapModule();
  }

  setModuleNameOverride(name: string | null) {
    // Clear the selection first so dataTree$ doesn't fire with a dataset
    // from the other module paired with the new module name
    this._selectedDataSet$.next(null);
    this.moduleNameOverride$.next(name);
  }

  private _selectedDataSet$ = new BehaviorSubject<BaseDataSet | null>(null);
  selectedDataSet$ = this._selectedDataSet$.asObservable().pipe(shareReplay(1));

  categories$ = this.mapModuleService.datasets$.pipe(
    distinctUntilChanged(),
    map((mapData) => mapData.categories),
    tap(() => queueMicrotask(() => this.loadingSubject.next(false)))
  );

  private _selection$ = new BehaviorSubject<BrowseSelection | null>(null);
  selection$ = this._selection$.asObservable().pipe(shareReplay(1));

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

  private layerClicked = new Subject<DataLayer>();
  public layerClicked$: Observable<DataLayer> =
    this.layerClicked.asObservable();

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
      return this.service
        .getPublicUrl(layer.id)
        .pipe(map((url) => ({ layer, url })));
    })
  );

  dataTree$ = combineLatest([
    this.selection$,
    this.planState.currentPlanOrNull$,
    this.moduleNameOverride$,
  ]).pipe(
    tap(() => this.loadingSubject.next(true)),
    switchMap(([selection, plan, override]) => {
      if (!selection) {
        this.loadingSubject.next(false);
        return of(null);
      }
      const module = override ?? this.mapModuleService.moduleName;
      const geometry = this.planGeometry(plan);
      // categories list their layers flat; datasets nest them by path
      const isCategory = selection.type === 'category';
      const workspaceId = this.requestWorkspaceId(plan);
      const layers$ = isCategory
        ? this.service.listCategoryDataLayers(
            selection.id,
            module,
            geometry,
            workspaceId
          )
        : this.service.listDataLayers(
            selection.id,
            module,
            geometry,
            workspaceId
          );
      return layers$.pipe(
        map((items) =>
          isCategory ? buildFlatTree(items) : buildPathTree(items)
        ),
        tap((s) => this.loadingSubject.next(false)),
        catchError((e) => {
          this.loadingSubject.next(false);
          this._selection$.next(null);
          this.matSnackBar.open(
            `Error: Could not load layers for ${selection.name}`,
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
    this.planState.currentPlanOrNull$,
    this.moduleNameOverride$,
  ]).pipe(
    switchMap(([term, offset, plan, override]) => {
      if (!term) {
        return of(null);
      }
      this.loadingSubject.next(true);

      const module = override ?? this.mapModuleService.moduleName;

      return this.service
        .search({
          term,
          limit: this.limit,
          offset,
          module,
          geometry: this.planGeometry(plan),
          workspaceId: this.requestWorkspaceId(plan),
        })
        .pipe(
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

  /**
   * Favorites the user flipped here, over what the payload said. Keeping only
   * the changes means every place that shows the same layer agrees at once,
   * without refetching, and a layer nobody touched keeps the server's answer.
   */
  private _favoriteChanges$ = new BehaviorSubject<ReadonlyMap<number, boolean>>(
    new Map()
  );

  /** Whether the star of this layer is filled right now. */
  isFavorite$(layer: DataLayer): Observable<boolean> {
    return this._favoriteChanges$.pipe(
      map((changes) => changes.get(layer.id) ?? layer.is_favorite === true),
      distinctUntilChanged()
    );
  }

  isFavorite(layer: DataLayer): boolean {
    return (
      this._favoriteChanges$.value.get(layer.id) ?? layer.is_favorite === true
    );
  }

  canEditFavorites$: Observable<boolean> =
    this.workspaceState.currentWorkspace$.pipe(
      map(
        (workspace) =>
          workspace.role === 'OWNER' || workspace.role === 'COLLABORATOR'
      ),
      catchError(() => of(false)),
      startWith(false),
      distinctUntilChanged(),
      shareReplay(1)
    );

  favoritesEnabled(): boolean {
    return (
      this.featureService.isFeatureEnabled('DATA_ORGANIZATION') &&
      this.workspaceState.currentWorkspaceIdValue !== null
    );
  }

  toggleFavorite(layer: DataLayer) {
    const workspaceId = this.workspaceState.currentWorkspaceIdValue;
    if (workspaceId === null || !this.favoritesEnabled()) {
      return;
    }
    const wanted = !this.isFavorite(layer);
    const previous = this._favoriteChanges$.value;
    const changes = new Map(previous);
    changes.set(layer.id, wanted);
    this._favoriteChanges$.next(changes);

    const request = wanted
      ? this.workspacesService.favoriteDataLayer(workspaceId, layer.id)
      : this.workspacesService.unfavoriteDataLayer(workspaceId, layer.id);

    request.subscribe({
      next: () => {
        this._reloadFavorites$.next();
        this.matSnackBar.open(
          wanted
            ? 'Layer added to favorites.'
            : 'Layer removed from favorites.',
          'Dismiss',
          SNACK_BOTTOM_NOTICE_CONFIG
        );
      },
      error: () => {
        this._favoriteChanges$.next(previous);
        this.matSnackBar.open(
          `There was an error trying to ${
            wanted ? 'favorite' : 'unfavorite'
          } this data layer.`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }

  private _reloadFavorites$ = new BehaviorSubject<void>(undefined);

  private favoritesFromServer$: Observable<Resource<DataLayer[]>> =
    this._reloadFavorites$.pipe(
      switchMap(() => {
        const workspaceId = this.favoritesWorkspaceId();
        if (workspaceId === null) {
          return of({ isLoading: false, data: [] } as Resource<DataLayer[]>);
        }
        return this.service
          .browseFavorites(workspaceId, this.mapModuleService.moduleName)
          .pipe(
            map(
              (layers) =>
                ({ isLoading: false, data: layers }) as Resource<DataLayer[]>
            ),
            catchError((error) =>
              of({ isLoading: false, error } as Resource<DataLayer[]>)
            ),
            startWith({ isLoading: true } as Resource<DataLayer[]>)
          );
      }),
      shareReplay(1)
    );

  /**
   * What the panel shows: the server's list, minus whatever was unfavorited
   * here since, so a row leaves the moment its star is emptied instead of
   * waiting for the refetch.
   */
  favorites$: Observable<Resource<DataLayer[]>> = combineLatest([
    this.favoritesFromServer$,
    this._favoriteChanges$,
  ]).pipe(
    map(([resource, changes]) =>
      resource.data
        ? {
            ...resource,
            data: resource.data.filter(
              (layer) => changes.get(layer.id) !== false
            ),
          }
        : resource
    ),
    shareReplay(1)
  );

  private favoritesWorkspaceId(): number | null {
    return this.favoritesEnabled()
      ? this.workspaceState.currentWorkspaceIdValue
      : null;
  }

  private planGeometry(plan: Plan | null): Geometry | undefined {
    return this.sendGeometry && plan ? (plan.geometry as Geometry) : undefined;
  }

  // Off the workspace route (a plan's map viewer) we still send the plan's
  // workspace, but favorites stay gated on favoritesEnabled().
  private requestWorkspaceId(plan: Plan | null): number | null {
    if (!this.featureService.isFeatureEnabled('DATA_ORGANIZATION')) {
      return null;
    }
    return (
      this.workspaceState.currentWorkspaceIdValue ?? plan?.workspace ?? null
    );
  }

  private _paths$ = new BehaviorSubject<string[]>([]);
  paths$ = this._paths$.asObservable();

  private _isBrowsing$ = new BehaviorSubject(true);
  isBrowsing$ = this._isBrowsing$.asObservable();

  constructor(
    private service: DataLayersService,
    private mapModuleService: MapModuleService,
    @Inject(MAX_SELECTED_DATALAYERS)
    private maxSelectedDatalayers: number,
    @Inject(USE_GEOMETRY)
    private readonly sendGeometry: boolean,
    private planState: PlanState,
    private matSnackBar: MatSnackBar,
    private featureService: FeatureService,
    private workspacesService: WorkspacesService,
    private workspaceState: WorkspaceState
  ) {}

  // determines whether we interject anything when the user makes a selection
  selectionMode: 'AUTOMATIC' | 'MANUAL' = 'AUTOMATIC';

  selectDataSet(dataset: BaseDataSet) {
    this.select({
      type: 'dataset',
      id: dataset.id,
      name: dataset.name,
      organization: dataset.organization,
    });
  }

  selectCategory(category: SimpleCategory) {
    this.select({ type: 'category', id: category.id, name: category.name });
  }

  private select(selection: BrowseSelection) {
    this._isBrowsing$.next(true);
    this._selection$.next(selection);
    this.loadingSubject.next(true);
  }

  goBackToSearchResults() {
    this._selection$.next(null);
    // if I go back but im not searching
    if (this._searchTerm$.value) {
      this._isBrowsing$.next(false);
    }
  }

  selectDataLayer(dataLayer: DataLayer | null) {
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
    this._selection$.next(null);
  }

  /**
   * Views a layer saved in local storage and browses to it. Copies saved
   * before simple categories existed are refreshed first, so DATA_ORGANIZATION
   * opens the layer's category instead of its dataset tree.
   */
  restoreDataLayer(stored: DataLayer) {
    const layer$ =
      this.featureService.isFeatureEnabled('DATA_ORGANIZATION') &&
      !stored.simple_categories?.length
        ? this.service
            .listDataLayers(stored.dataset.id, this.mapModuleService.moduleName)
            .pipe(
              map((layers) => layers.find((l) => l.id === stored.id) ?? stored),
              catchError(() => of(stored))
            )
        : of(stored);
    layer$.subscribe((layer) => {
      this.selectDataLayer(layer);
      this.goToSelectedLayer(layer);
    });
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
    const target = this.browseSelectionFor(layer);
    // only reselect if it's not the one selected already
    const current = this._selection$.value;
    if (current?.type !== target.type || current.id !== target.id) {
      // reset previous results
      this._selection$.next(null);
      this.select(target);
    }
    this._paths$.next(layer.path);
  }

  private browseSelectionFor(layer: DataLayer): BrowseSelection {
    const categories = layer.simple_categories ?? [];
    if (
      this.featureService.isFeatureEnabled('DATA_ORGANIZATION') &&
      categories.length > 0
    ) {
      // stay in the current category if the layer belongs to it
      const current = this._selection$.value;
      const category =
        categories.find(
          (c) => current?.type === 'category' && c.id === current.id
        ) ?? categories[0];
      return { type: 'category', id: category.id, name: category.name };
    }
    return {
      type: 'dataset',
      id: layer.dataset.id,
      name: layer.dataset.name,
      organization: layer.organization,
    };
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

  addSelectedLayer(layer: DataLayer) {
    const currentLayers = this._selectedDataLayers$.value;

    // Check if the layer is already in the list by its ID
    const exists = currentLayers.some(
      (existingLayer) => existingLayer.id === layer.id
    );

    if (!exists) {
      const updatedSelectedDatalayers = [...currentLayers, layer];
      this._selectedDataLayers$.next(updatedSelectedDatalayers);
    }
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
  handleLayerClick(layer: DataLayer) {
    // if this is automatic, we go ahead and 'automatically' toggle...
    if (this.selectionMode === 'AUTOMATIC') {
      this.toggleLayer(layer);
    } else {
      // otherwise we throw an event, and let the subscriber 'manually' select
      this.layerClicked.next(layer);
    }
  }

  toggleLayer(layer: DataLayer) {
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

  setSelectionMode(mode: 'AUTOMATIC' | 'MANUAL') {
    this.selectionMode = mode;
  }
}
