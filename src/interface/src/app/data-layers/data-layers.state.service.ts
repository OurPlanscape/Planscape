import { Injectable } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { DataLayer, DataSet, Pagination, SearchResult } from '@types';
import { buildPathTree } from './data-layers/tree-node';
import { extractLegendInfo } from './utilities';
import type { MatTab } from '@angular/material/tabs';
import { BaseLayerTooltipData } from '../maplibre-map/map-base-layer-tooltip/map-base-layer-tooltip.component';

@Injectable({
  providedIn: 'root',
})
export class DataLayersStateService {
  readonly limit = 20;

  private _datasetsCurrentPage$ = new BehaviorSubject(1);
  datasetsCurrentPage$ = this._datasetsCurrentPage$.asObservable();

  dataSets$ = this._datasetsCurrentPage$.pipe(
    distinctUntilChanged(),
    tap(() => this.loadingSubject.next(true)),
    switchMap((currentPage) => {
      const offset = (currentPage - 1) * this.limit;
      return this.service.listDataSets(this.limit, offset);
    }),
    tap(() => {
      this.loadingSubject.next(false);
    }),
    shareReplay(1)
  );
  private _selectedDataSet$ = new BehaviorSubject<DataSet | null>(null);
  selectedDataSet$ = this._selectedDataSet$.asObservable().pipe(shareReplay(1));

  private _selectedDataLayer$ = new BehaviorSubject<DataLayer | null>(null);
  selectedDataLayer$ = this._selectedDataLayer$.asObservable();

  private _selectedLayerTab$ = new BehaviorSubject<MatTab | null>(null);
  selectedLayerTab$ = this._selectedLayerTab$.asObservable();

  private _showBaselayerTooltip$ = new BehaviorSubject<boolean>(false);
  baseLayerTooltip$ = this._showBaselayerTooltip$.asObservable();

  private _tooltipInfo$ = new BehaviorSubject<BaseLayerTooltipData | null>(null);
  tooltipInfo$ = this._tooltipInfo$.asObservable();

  dataLayerWithUrl$ = this.selectedDataLayer$.pipe(
    switchMap((layer) => {
      if (!layer) {
        return of(null);
      }
      return this.service
        .getPublicUrl(layer.id)
        .pipe(map((url) => ({ layer, url })));
    })
  );

  dataTree$ = this.selectedDataSet$.pipe(
    switchMap((dataset) => {
      if (!dataset) {
        this.loadingSubject.next(false);
        return of(null);
      }
      return this.service.listDataLayers(dataset.id).pipe(
        map((items) => buildPathTree(items)),
        tap((s) => this.loadingSubject.next(false))
      );
    }),
    shareReplay(1)
  );

  hasNoTreeData$ = this.dataTree$.pipe(map((d) => !!d && d.length === 0));

  private loadingLayer = new BehaviorSubject(false);
  loadingLayer$ = this.loadingLayer.asObservable();

  private loadingSubject = new BehaviorSubject(false);
  loading$ = this.loadingSubject.asObservable();

  private _offset = new BehaviorSubject(0);

  private _searchTerm$ = new BehaviorSubject<string>('');
  searchTerm$ = this._searchTerm$.asObservable();

  colorLegendInfo$ = this.selectedDataLayer$.pipe(
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
  ]).pipe(
    tap(() => this.loadingSubject.next(true)),
    switchMap(([term, offset]) => {
      if (!term) {
        this.loadingSubject.next(false);
        return of(null);
      }
      return this.service.search(term, this.limit, offset).pipe(
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

  constructor(private service: DataLayersService) { }

  selectDataSet(dataset: DataSet) {
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
    this._selectedDataLayer$.next(dataLayer);
  }

  setDataLayerLoading(status: boolean) {
    this.loadingLayer.next(status);
  }

  clearDataLayer() {
    this._selectedDataLayer$.next(null);
  }

  reloadDataLayerUrl() {
    const currentLayer = this._selectedDataLayer$.value;
    this._selectedDataLayer$.next(currentLayer);
  }

  setSelectedTab(currentTab: MatTab) {
    this._selectedLayerTab$.next(currentTab);
  }

  setTooltipData(tooltipInfo: BaseLayerTooltipData | null) {
    this._tooltipInfo$.next(tooltipInfo);
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

  changeDatasetsPage(page: number) {
    this._datasetsCurrentPage$.next(page);
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
}
