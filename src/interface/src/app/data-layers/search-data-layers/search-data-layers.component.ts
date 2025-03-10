import { Component } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import { FormsModule } from '@angular/forms';
import { DataLayer, DataSetSearchResult } from '@types';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent, SearchBarComponent } from '@styleguide';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  GroupedDatalayers,
  groupSearchResults,
  Results,
} from '../data-layers/search';

@Component({
  selector: 'app-search-data-layers',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    KeyValuePipe,
    SearchBarComponent,
    AsyncPipe,
    MatProgressSpinnerModule,
    ButtonComponent,
  ],
  templateUrl: './search-data-layers.component.html',
  styleUrl: './search-data-layers.component.scss',
})
export class SearchDataLayersComponent {
  searchTerm$ = new BehaviorSubject<string>('');
  resultCount: number | null = null;

  private loadingSubject = new BehaviorSubject(false);
  loading$ = this.loadingSubject.asObservable();

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

  constructor(private dataLayersService: DataLayersService) {}

  results: {
    dataSets: DataSetSearchResult[];
    groupedLayers: GroupedDatalayers;
  } | null = null;

  search(term: string) {
    this.searchTerm$.next(term);
  }

  getPath(result: DataSetSearchResult) {
    return (result.data as DataLayer).path.join('-');
  }

  goToDataSet(id: number) {
    // navigate to the dataset somehow.
  }
}
