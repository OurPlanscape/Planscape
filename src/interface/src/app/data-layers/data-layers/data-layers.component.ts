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
  SearchBarComponent,
} from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataLayersStateService } from '../data-layers.state.service';
import { catchError, map, Observable, startWith, throwError } from 'rxjs';
import { groupSearchResults, Results } from './search';
import { DataLayerTreeComponent } from '../data-layer-tree/data-layer-tree.component';
import { SearchResultsComponent } from '../search-results/search-results.component';
import { DataSetComponent } from '../data-set/data-set.component';
import { UntilDestroy } from '@ngneat/until-destroy';

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
  ],
  templateUrl: './data-layers.component.html',
  styleUrls: ['./data-layers.component.scss'],
})
export class DataLayersComponent {
  constructor(private dataLayersStateService: DataLayersStateService) {}

  loading$ = this.dataLayersStateService.loading$;

  dataSets$ = this.dataLayersStateService.dataSets$;
  selectedDataSet$ = this.dataLayersStateService.selectedDataSet$;

  searchTerm$ = this.dataLayersStateService.searchTerm$;
  resultCount: number | null = null;

  results$: Observable<Results | null> =
    this.dataLayersStateService.searchResults$.pipe(
      startWith(null),
      map((results) => {
        if (results) {
          this.resultCount = results.length;
          return groupSearchResults(results);
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

  search(term: string) {
    this.dataLayersStateService.search(term);
  }

  viewDatasetCategories(dataSet: DataSet) {
    this.dataLayersStateService.selectDataSet(dataSet);
  }

  viewResultDataSet(dataSet: DataSet) {
    this.dataLayersStateService.selectDataSet(dataSet);
  }

  goBack() {
    this.dataLayersStateService.goBackToSearchResults();
  }

  clearSearch() {
    this.dataLayersStateService.clearSearch();
  }
}
