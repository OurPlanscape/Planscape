import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
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
} from 'rxjs';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { DataLayersService } from '@services/data-layers.service';
import { MapModuleService } from '@services/map-module.service';
import { SNACK_ERROR_CONFIG } from '@shared';
import {
  ButtonComponent,
  NoResultsComponent,
  SearchBarComponent,
} from '@styleguide';
import { BaseLayer, MapDataDataSet, SearchResult } from '@types';
import { BaseLayersGroupComponent } from './base-layers-group/base-layers-group.component';

export interface BaseLayerSearchGroup {
  dataSet: MapDataDataSet;
  /** Matching layers, or null when only the dataset itself matched. */
  layers: BaseLayer[] | null;
}

export interface BaseLayerSearchResults {
  groups: BaseLayerSearchGroup[];
  /** The backend had more matches than SEARCH_LIMIT. */
  truncated: boolean;
}

// Base layer datasets are small, so we fetch every match in one go and skip pagination.
export const SEARCH_LIMIT = 100;

/**
 * Base layers panel used when DATA_ORGANIZATION is on: a search bar over a
 * list of base-layers groups, one per dataset.
 */
@Component({
  selector: 'app-base-layers-panel',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    BaseLayersGroupComponent,
    MatProgressSpinnerModule,
    NgForOf,
    NgIf,
    NoResultsComponent,
    SearchBarComponent,
  ],
  templateUrl: './base-layers-panel.component.html',
  styleUrl: './base-layers-panel.component.scss',
})
export class BaseLayersPanelComponent {
  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;
  selectedLayersDataSet$ = this.selectedLayers$.pipe(
    // just return the first item data set id, as we can only have 1 dataset active.
    map((layers) => layers?.[0]?.dataset.id ?? null)
  );
  selectedLayersId$ = this.selectedLayers$.pipe(
    map((layers) => layers?.map((l) => l.id) ?? [])
  );

  baseDataSets$ = this.mapModuleService.datasets$.pipe(
    map((mapData) => mapData.base_datasets)
  );

  private _searchTerm$ = new BehaviorSubject<string>('');
  searchTerm$ = this._searchTerm$.asObservable();

  readonly SEARCH_LIMIT = SEARCH_LIMIT;

  /** null while there is no term or the search is in flight. */
  searchResults$: Observable<BaseLayerSearchResults | null> = combineLatest([
    this.searchTerm$,
    this.baseDataSets$,
  ]).pipe(
    switchMap(([term, dataSets]) => {
      if (!term) {
        return of(null);
      }
      return this.dataLayersService
        .search({
          term,
          type: 'VECTOR',
          limit: SEARCH_LIMIT,
          module: this.mapModuleService.moduleName,
        })
        .pipe(
          map((response) => ({
            groups: groupSearchResults(response.results, dataSets),
            truncated: response.count > response.results.length,
          })),
          catchError(() => {
            this.matSnackBar.open(
              'Error: Could not search base layers',
              'Dismiss',
              SNACK_ERROR_CONFIG
            );
            return of({ groups: [], truncated: false });
          }),
          // drop the previous term's results while this one loads
          startWith(null)
        );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
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

  // A group switching between preloaded and fetched layers needs a fresh component.
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
