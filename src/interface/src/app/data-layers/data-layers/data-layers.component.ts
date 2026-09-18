import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCommonModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatTreeModule } from '@angular/material/tree';
import { DataLayerTreeComponent } from '@data-layers/data-layer-tree/data-layer-tree.component';
import { DataSetComponent } from '@data-layers/data-set/data-set.component';
import { SearchResultsComponent } from '@data-layers/search-results/search-results.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import {
  ButtonComponent,
  ExpanderSectionComponent,
  NoResultsComponent,
  PaginatorComponent,
  SearchBarComponent,
} from '@styleguide';
import { BaseDataSet } from '@types';
import {
  catchError,
  combineLatest,
  map,
  Observable,
  startWith,
  tap,
  throwError,
} from 'rxjs';
import { DataLayersStateService } from '../data-layers.state.service';
import { groupSearchResults, Results } from './search';

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
  @Input() displayAddButton = false;
  @Input() useClearFooter = true;

  constructor(private dataLayersStateService: DataLayersStateService) {}

  loading$ = this.dataLayersStateService.loading$;

  dataSets$ = this.dataLayersStateService.dataSets$;

  selectedDataSet$ = this.dataLayersStateService.selectedDataSet$;
  viewedDataLayer$ = this.dataLayersStateService.viewedDataLayer$;

  searchTerm$ = this.dataLayersStateService.searchTerm$.pipe(
    tap(() => {
      // reset count when the search term changes
      this.resultCount = 0;
    })
  );
  resultCount: number | null = null;

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

  showFooter$ = combineLatest([this.results$, this.viewedDataLayer$]).pipe(
    map(([results, selectedLayer]) => this.pages > 1 || selectedLayer)
  );

  showDatasets$ = combineLatest([this.dataSets$, this.loading$]).pipe(
    map(([dataSets, loading]) => {
      return dataSets.length > 0 && !loading;
    })
  );

  get pages() {
    return this.resultCount
      ? Math.ceil(this.resultCount / this.dataLayersStateService.limit)
      : 0;
  }

  search(term: string) {
    this.dataLayersStateService.search(term);
  }

  showPage(page: number) {
    this.dataLayersStateService.changePage(page);
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

  clearViewedDataLayer() {
    this.dataLayersStateService.clearViewedDataLayer();
  }
}
