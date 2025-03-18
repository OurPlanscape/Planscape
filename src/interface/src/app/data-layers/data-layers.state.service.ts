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
  _selectedDataSet$ = new BehaviorSubject<DataSet | null>(null);
  selectedDataSet$ = this._selectedDataSet$.asObservable().pipe(shareReplay(1));

  _selectedDataLayer$ = new BehaviorSubject<DataLayer | null>(null);
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

  private loadingSubject = new BehaviorSubject(false);
  loading$ = this.loadingSubject.asObservable();

  searchTerm$ = new BehaviorSubject<string>('');

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

  paths$ = new BehaviorSubject<string[]>([]);

  constructor(private service: DataLayersService) {}

  selectDataSet(dataset: DataSet) {
    this._selectedDataSet$.next(dataset);
    this.loadingSubject.next(true);
  }

  clearDataSet() {
    this._selectedDataSet$.next(null);
  }

  selectDataLayer(dataLayer: DataLayer) {
    this._selectedDataLayer$.next(dataLayer);
  }

  clearDataLayer() {
    this._selectedDataLayer$.next(null);
  }

  goToSelectedLayer(layer: DataLayer) {
    // Reset search
    this.searchTerm$.next('');
    // needs to select the dataset if it's not the same as the one selected already
    if (this._selectedDataSet$.value?.id !== layer.dataset.id) {
      const dataSet: Partial<DataSet> = {
        ...layer.dataset,
        organization: layer.organization,
      };
      this.selectDataSet(dataSet as DataSet);
    }
    this.paths$.next(layer.path);
  }
}
