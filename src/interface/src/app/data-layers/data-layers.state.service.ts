import { Injectable } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import { BehaviorSubject, map, of, shareReplay, switchMap } from 'rxjs';
import { DataLayer, DataSet } from '@types';
import { buildPathTree } from './data-layers/tree-node';

const mockLayer = '';
const mockStyle = {
  map_type: 'RAMP',
  no_data: {
    values: [0.003],
    color: '#CCCCCC',
    opacity: 0.0,
    label: '0',
  },
  entries: [
    {
      value: 0.008,
      color: '#F5CC00',
      opacity: 1.0,
      label: null,
    },
    {
      value: 0.013,
      color: '#F5A300',
      opacity: 1.0,
      label: null,
    },
    {
      value: 0.019,
      color: '#F57A00',
      opacity: 1.0,
      label: null,
    },
    {
      value: 0.026,
      color: '#F55200',
      opacity: 1.0,
      label: null,
    },
    {
      value: 0.036,
      color: '#F52900',
      opacity: 1.0,
      label: null,
    },
    {
      value: 0.057,
      color: '#F50000',
      opacity: 1.0,
      label: '0.06',
    },
  ],
};

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
    // trigger loading the url, etc...
    console.log('we selected this thing: ', dataLayer);
    const url = dataLayer.public_url;
    console.log('and the url is this:', url);
    // TODO:Remove - but we will just load an example/mock for now...

    console.log('lets use this mocklayer:', mockLayer);
    console.log('and this mockLayerStyle:', mockStyle);
  }

  clearDataLayer() {
    this._selectedDataLayer$.next(null);
  }
}
