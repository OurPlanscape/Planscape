import { Injectable } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import { BehaviorSubject, map, of, shareReplay, switchMap } from 'rxjs';
import { DataLayer, DataSet } from '@types';
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
        return of(null);
      }
      return this.service
        .listDataLayers(dataset.id)
        .pipe(map((items) => buildPathTree(items)));
    }),
    shareReplay(1)
  );

  hasNoTreeData$ = this.dataTree$.pipe(map((d) => !!d && d.length === 0));

  constructor(private service: DataLayersService) {}

  selectDataSet(dataset: DataSet) {
    this._selectedDataSet$.next(dataset);
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
