import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
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
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { DataLayersService } from '@services/data-layers.service';
import { MapModuleService } from '@services/map-module.service';
import { SNACK_ERROR_CONFIG } from '@shared';
import {
  ButtonComponent,
  NoResultsComponent,
  SearchBarComponent,
} from '@styleguide';
import { BaseLayer, MapDataDataSet, Pagination, SearchResult } from '@types';
import { BaseLayersGroupComponent } from './base-layers-group/base-layers-group.component';

export interface BaseLayerSearchGroup {
  dataSet: MapDataDataSet;
  layers: BaseLayer[];
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

  searchTerm$ = this.baseLayersStateService.searchTerm$;

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
      const module = this.mapModuleService.moduleName;
      const toResults = (response: Pagination<SearchResult>) => ({
        groups: groupSearchResults(response.results, dataSets, term),
        truncated: response.count > response.results.length,
      });
      const cached = this.baseLayersStateService.getCachedSearch(module, term);
      if (cached) {
        return of(toResults(cached));
      }
      return this.dataLayersService
        .search({
          term,
          type: 'VECTOR',
          limit: SEARCH_LIMIT,
          module,
        })
        .pipe(
          tap((response) =>
            this.baseLayersStateService.cacheSearch(module, term, response)
          ),
          map(toResults),
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
    this.baseLayersStateService.setSearchTerm(term.trim());
  }

  clearSearch() {
    this.baseLayersStateService.setSearchTerm('');
  }

  // Falls back to the selected layers' dataset until the user toggles a group.
  isBrowseGroupExpanded(dataSetId: number, selectedDataSetId: number | null) {
    return (
      this.baseLayersStateService.isDataSetExpanded(dataSetId) ??
      selectedDataSetId === dataSetId
    );
  }

  onBrowseGroupToggled(dataSetId: number, expanded: boolean) {
    this.baseLayersStateService.setDataSetExpanded(dataSetId, expanded);
  }

  trackGroup(_: number, group: BaseLayerSearchGroup) {
    return group.dataSet.id;
  }
}

/**
 * Groups layers whose own name matches the term under the module's base
 * datasets, keeping their order. Dataset, organization and category matches
 * from the backend are dropped.
 */
export function groupSearchResults(
  results: SearchResult[],
  dataSets: MapDataDataSet[],
  term: string
): BaseLayerSearchGroup[] {
  const needle = term.toLowerCase();
  const layers = results
    .filter((r) => r.type === 'DATALAYER')
    .map((r) => r.data as unknown as BaseLayer)
    .filter((l) => l.name.toLowerCase().includes(needle));

  return dataSets
    .map((dataSet) => ({
      dataSet,
      layers: layers.filter((l) => l.dataset.id === dataSet.id),
    }))
    .filter((group) => group.layers.length > 0);
}
