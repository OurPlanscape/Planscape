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
import { DataLayer, DataSet, DataSetSearchResult } from '@types';
import { buildPathTree } from './data-layers/tree-node';

@Injectable({
  providedIn: 'root',
})
export class DataLayersStateService {
  dataSets$ = this.service.listDataSets().pipe(shareReplay(1));
  _selectedDataSet$ = new BehaviorSubject<DataSet | null>(null);
  selectedDataSet$ = this._selectedDataSet$.asObservable();

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

  searchResults$: Observable<DataSetSearchResult[] | null> =
    this.searchTerm$.pipe(
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
      })
    );

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
}
