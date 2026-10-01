import { Component, Input } from '@angular/core';
import { BaseLayersListComponent } from '@base-layers/base-layers-list/base-layers-list.component';
import { BaseLayersStateService } from '../base-layers.state.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { BaseLayer, MapDataDataSet, SearchResult } from '@types';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ButtonComponent,
  NoResultsComponent,
  SearchBarComponent,
} from '@styleguide';
import { MapModuleService } from '@services/map-module.service';
import { DataLayersService } from '@services/data-layers.service';
import { SNACK_ERROR_CONFIG } from '@shared';

export interface BaseLayerSearchGroup {
  dataSet: MapDataDataSet;
  /** Matching layers, or null when only the dataset itself matched. */
  layers: BaseLayer[] | null;
}

// Base layer datasets are small, so we fetch every match in one go and skip pagination.
const SEARCH_LIMIT = 100;

@Component({
  selector: 'app-base-layers',
  standalone: true,
  imports: [
    AsyncPipe,
    BaseLayersListComponent,
    ButtonComponent,
    MatButtonModule,
    MatProgressSpinnerModule,
    NgForOf,
    NgIf,
    NoResultsComponent,
    SearchBarComponent,
  ],
  templateUrl: './base-layers.component.html',
  styleUrl: './base-layers.component.scss',
})
export class BaseLayersComponent {
  /** Only the DATA_ORGANIZATION sidebar shows the search bar. */
  @Input() showSearch = false;

  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;
  selectedLayersDataSet$ = this.selectedLayers$.pipe(
    // just return the first item data set id, as we can only have 1 dataset active.
    map((layers) => layers?.[0]?.dataset.id ?? null)
  );
  selectedLayersId$ = this.selectedLayers$.pipe(
    map((layers) => {
      if (layers && layers.length) {
        return layers.map((l) => l.id);
      }
      return [];
    })
  );

  baseDataSets$ = this.mapModuleService.datasets$.pipe(
    map((mapData) => mapData.base_datasets)
  );

  private _searchTerm$ = new BehaviorSubject<string>('');
  searchTerm$ = this._searchTerm$.asObservable();

  private _searching$ = new BehaviorSubject(false);
  searching$ = this._searching$.asObservable();

  searchResults$: Observable<BaseLayerSearchGroup[] | null> = combineLatest([
    this.searchTerm$,
    this.baseDataSets$,
  ]).pipe(
    switchMap(([term, dataSets]) => {
      if (!term) {
        return of(null);
      }
      this._searching$.next(true);
      return this.dataLayersService
        .search({
          term,
          type: 'VECTOR',
          limit: SEARCH_LIMIT,
          module: this.mapModuleService.moduleName,
        })
        .pipe(
          map((response) => groupSearchResults(response.results, dataSets)),
          catchError(() => {
            this.matSnackBar.open(
              'Error: Could not search base layers',
              'Dismiss',
              SNACK_ERROR_CONFIG
            );
            return of([]);
          }),
          finalize(() => this._searching$.next(false))
        );
    }),
    shareReplay(1)
  );

  constructor(
    private baseLayersStateService: BaseLayersStateService,
    private mapModuleService: MapModuleService,
    private dataLayersService: DataLayersService,
    private matSnackBar: MatSnackBar
  ) {}

  updateSelectedLayer(data: { layer: BaseLayer; isMulti: boolean }) {
    this.baseLayersStateService.updateBaseLayers(data.layer, data.isMulti);
  }

  clearBaseLayer() {
    this.baseLayersStateService.clearBaseLayer();
  }

  search(term: string) {
    this._searchTerm$.next(term.trim());
  }

  clearSearch() {
    this._searchTerm$.next('');
  }

  // A group switching between preloaded and fetched layers needs a fresh list component.
  trackGroup(_: number, group: BaseLayerSearchGroup) {
    return `${group.dataSet.id}-${group.layers ? 'layers' : 'dataset'}`;
  }
}

/**
 * Groups results under the module's base datasets, keeping their order.
 * Layer matches win; a dataset that only matched by name/org shows all its layers.
 */
export function groupSearchResults(
  results: SearchResult[],
  dataSets: MapDataDataSet[]
): BaseLayerSearchGroup[] {
  const matchedDataSetIds = new Set(
    results.filter((r) => r.type === 'DATASET').map((r) => r.id)
  );
  const layers = results
    .filter((r) => r.type === 'DATALAYER')
    .map((r) => r.data as unknown as BaseLayer);

  return dataSets
    .map((dataSet) => {
      const dataSetLayers = layers.filter((l) => l.dataset.id === dataSet.id);
      if (dataSetLayers.length) {
        return { dataSet, layers: dataSetLayers };
      }
      return matchedDataSetIds.has(dataSet.id)
        ? { dataSet, layers: null }
        : null;
    })
    .filter((group): group is BaseLayerSearchGroup => group !== null);
}
