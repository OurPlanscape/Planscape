import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { DataSet } from '../../types/data-sets';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatCommonModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import {
  ButtonComponent,
  ExpanderSectionComponent,
  SearchBarComponent,
} from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataLayersStateService } from '../data-layers.state.service';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { DataLayersService } from '@services/data-layers.service';
import { groupSearchResults, Results } from './search';
import { DataLayerTreeComponent } from '../data-layer-tree/data-layer-tree.component';
import { SearchResultsComponent } from '../search-results/search-results.component';

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
  ],
  templateUrl: './data-layers.component.html',
  styleUrls: ['./data-layers.component.scss'],
})
export class DataLayersComponent {
  constructor(
    private dataLayersStateService: DataLayersStateService,
    private dataLayersService: DataLayersService
  ) {}

  loading = false;
  // TODO USE THIS?
  private loadingSubject = new BehaviorSubject(false);
  loading$ = this.loadingSubject.asObservable();

  dataSets$ = this.dataLayersStateService.dataSets$;
  selectedDataSet$ = this.dataLayersStateService.selectedDataSet$;

  searchTerm$ = new BehaviorSubject<string>('');
  resultCount: number | null = null;

  results$: Observable<Results | null> = this.searchTerm$.pipe(
    tap(() => this.loadingSubject.next(true)),
    switchMap((term: string) => {
      if (!term) {
        this.loadingSubject.next(false);
        return of(null);
      }
      return this.dataLayersService.search(term).pipe(
        startWith(null),
        map((results) => {
          if (results) {
            this.loadingSubject.next(false);
            this.resultCount = results.length;
            return groupSearchResults(results);
          } else {
            return results;
          }
        })
      );
    }),

    catchError((err) => {
      // You might handle the error here, show a toast, etc.
      return throwError(() => err);
    })
  );

  hasNoData$ = this.dataLayersStateService.hasNoTreeData$;

  search(term: string) {
    console.log('search!', term);
    this.searchTerm$.next(term);
  }

  viewDatasetCategories(dataSet: DataSet) {
    this.dataLayersStateService.selectDataSet(dataSet);
    this.loading = true;
  }

  goBack() {
    this.dataLayersStateService.clearDataSet();
    this.loading = false;
  }
}
