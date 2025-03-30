import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { DataSet } from '@types';
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
  constructor(private dataLayersStateService: DataLayersStateService) {}

  loading$ = this.dataLayersStateService.loading$;

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

  showFooter$ = combineLatest([this.results$, this.selectedDataLayer$]).pipe(
    map(([results, selectedLayer]) => this.pages > 1 || selectedLayer)
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

  viewDatasetCategories(dataSet: DataSet) {
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
}
