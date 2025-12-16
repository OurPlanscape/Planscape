import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { BaseDataSet } from '@types';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatCommonModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import {
  ButtonComponent,
  ExpanderSectionComponent,
  NoResultsComponent,
  PaginatorComponent,
  SearchBarComponent,
} from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataLayersStateService } from '../data-layers.state.service';
import {
  catchError,
  combineLatest,
  map,
  Observable,
  startWith,
  tap,
  throwError,
} from 'rxjs';
import { groupSearchResults, Results } from './search';
import { DataLayerTreeComponent } from '../data-layer-tree/data-layer-tree.component';
import { SearchResultsComponent } from '../search-results/search-results.component';
import { DataSetComponent } from '../data-set/data-set.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { FeatureService } from '../../features/feature.service';

@UntilDestroy()
@Component({
  selector: 'app-data-layers',
  standalone: true,
  imports: [
    NgForOf,
    AsyncPipe,
    MatTreeModule,
    MatIconModule,
    MatCommonModule,
    MatButtonModule,
    NgIf,
    ExpanderSectionComponent,
    NgClass,
    MatProgressSpinnerModule,
    ButtonComponent,
    DataLayerTreeComponent,
    SearchBarComponent,
    SearchResultsComponent,
    DataSetComponent,
    NoResultsComponent,
    MatRadioModule,
    FormsModule,
    PaginatorComponent,
  ],
  templateUrl: './data-layers.component.html',
  styleUrls: ['./data-layers.component.scss'],
})
export class DataLayersComponent {
  constructor(
    private dataLayersStateService: DataLayersStateService,
    private featureService: FeatureService
  ) {}

  loading$ = this.dataLayersStateService.loading$;

  legacyDataSets$ = this.dataLayersStateService.legacyDataSets$.pipe(
    map((dataset) => {
      this.datasetCount = dataset.count;
      return dataset;
    })
  );

  dataSets$ = this.dataLayersStateService.dataSets$;

  selectedDataSet$ = this.dataLayersStateService.selectedDataSet$;
  selectedDataLayer$ = this.dataLayersStateService.selectedDataLayer$;

  searchTerm$ = this.dataLayersStateService.searchTerm$.pipe(
    tap(() => {
      // reset count when the search term changes
      this.resultCount = 0;
    })
  );
  resultCount: number | null = null;
  datasetCount: number | null = null;

  results$: Observable<Results | null> =
    this.dataLayersStateService.searchResults$.pipe(
      startWith(null),
      map((results) => {
        if (results) {
          this.resultCount = results.count;
          return groupSearchResults(results.results);
        } else {
          return results;
        }
      }),
      catchError((err) => {
        // TODO handle errors
        return throwError(() => err);
      })
    );

  hasNoData$ = this.dataLayersStateService.hasNoTreeData$;
  isBrowsing$ = this.dataLayersStateService.isBrowsing$;

  showFooter$ = combineLatest([
    this.results$,
    this.selectedDataLayer$,
    this.legacyDataSets$,
  ]).pipe(
    map(
      ([results, selectedLayer, datasets]) =>
        this.pages > 1 || selectedLayer || this.datasetPages > 1
    )
  );

  showDatasets$ = combineLatest([this.legacyDataSets$, this.loading$]).pipe(
    map(([dataSets, loading]) => {
      return dataSets?.results.length > 0 && !loading;
    })
  );

  showDatasetPagination$ = combineLatest([
    this.selectedDataSet$,
    this.isBrowsing$,
  ]).pipe(
    map(([selectedDataSet, isBrowsing]) => {
      return !selectedDataSet && isBrowsing;
    })
  );

  get pages() {
    return this.resultCount
      ? Math.ceil(this.resultCount / this.dataLayersStateService.limit)
      : 0;
  }

  get datasetPages() {
    if (this.isUsingMapModule) {
      return 0;
    }
    return this.datasetCount
      ? Math.ceil(this.datasetCount / this.dataLayersStateService.limit)
      : 0;
  }

  datasetCurrentPage$ = this.dataLayersStateService.datasetsCurrentPage$;

  search(term: string) {
    this.dataLayersStateService.search(term);
  }

  showPage(page: number) {
    this.dataLayersStateService.changePage(page);
  }

  showDatasetsPage(page: number) {
    this.dataLayersStateService.changeDatasetsPage(page);
  }

  viewDatasetCategories(dataSet: BaseDataSet) {
    this.dataLayersStateService.resetPath();
    this.dataLayersStateService.selectDataSet(dataSet);
  }

  goBack() {
    this.dataLayersStateService.goBackToSearchResults();
  }

  clearSearch() {
    this.dataLayersStateService.clearSearch();
  }

  clearDataLayer() {
    this.dataLayersStateService.clearDataLayer();
  }

  get isUsingMapModule() {
    return this.featureService.isFeatureEnabled('MAP_MODULE');
  }
}
