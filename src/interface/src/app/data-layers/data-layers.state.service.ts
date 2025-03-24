import { Injectable } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import {
  BehaviorSubject,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { DataLayer, DataSet, SearchResult } from '@types';
import { buildPathTree } from './data-layers/tree-node';

@Injectable({
  providedIn: 'root',
})
export class DataLayersStateService {
  dataSets$ = this.service.listDataSets().pipe(shareReplay(1));
  private _selectedDataSet$ = new BehaviorSubject<DataSet | null>(null);
  selectedDataSet$ = this._selectedDataSet$.asObservable().pipe(shareReplay(1));

  private _selectedDataLayer$ = new BehaviorSubject<DataLayer | null>(null);
  selectedDataLayer$ = this._selectedDataLayer$.asObservable();

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

  private _searchTerm$ = new BehaviorSubject<string>('');
  searchTerm$ = this._searchTerm$.asObservable();

  searchResults$: Observable<SearchResult[] | null> = this.searchTerm$.pipe(
    tap(() => this.loadingSubject.next(true)),
    switchMap((term: string) => {
      if (!term) {
        this.loadingSubject.next(false);
        return of(null);
      }
      return this.service.search(term).pipe(
        startWith(null),
        map((results) => {
          if (results) {
            this.loadingSubject.next(false);
          }
          return results;
        })
      );
    }),
    shareReplay(1)
  );

  private _paths$ = new BehaviorSubject<string[]>([]);
  paths$ = this._paths$.asObservable();

  private _isBrowsing$ = new BehaviorSubject(true);
  isBrowsing$ = this._isBrowsing$.asObservable();

  constructor(private service: DataLayersService) {}

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
    this.loadingLayer.next(true);
    this._selectedDataLayer$.next(dataLayer);
  }

  clearDataLayer() {
    this._selectedDataLayer$.next(null);
  }

  search(term: string) {
    this._searchTerm$.next(term);
    this._isBrowsing$.next(!term);
  }

  clearSearch() {
    this.search('');
    this._selectedDataSet$.next(null);
  }

  goToSelectedLayer(layer: DataLayer) {
    // Reset search
    this._searchTerm$.next('');
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
}
