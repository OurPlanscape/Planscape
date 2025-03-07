import { Component } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import { FormsModule } from '@angular/forms';
import { DataLayer, DataSetSearchResult } from '@types';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { SearchBarComponent } from '@styleguide';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Results {
  dataSets: DataSetSearchResult[];
  groupedLayers: GroupedDatalayers;
}

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
  ],
  templateUrl: './search-data-layers.component.html',
  styleUrl: './search-data-layers.component.scss',
})
export class SearchDataLayersComponent {
  private searchTerm$ = new Subject<string>();

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
            return groupDatalayersOneLevel(results);
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
}

/**
 * A single grouping structure for DATALAYERs,
 * keyed by a path-based string. Each group
 * also stores the actual path array for reference
 */
interface GroupedDatalayers {
  [pathKey: string]: {
    path: string[];
    layers: DataSetSearchResult[];
  };
}

function groupDatalayersOneLevel(results: DataSetSearchResult[]) {
  // Separate Datasets & Datalayers
  const dataSets = results.filter((r) => r.type === 'DATASET');
  const dataLayers = results.filter((r) => r.type === 'DATALAYER');

  // Group DATALAYERs by their path array, joined with a delimiter
  const grouped: GroupedDatalayers = {};

  for (const layer of dataLayers) {
    const pathArr = (layer.data as DataLayer).path || [];
    const pathKey = pathArr.join(' - '); // e.g. "Fire - Smoke"

    if (!grouped[pathKey]) {
      grouped[pathKey] = {
        path: pathArr,
        layers: [],
      };
    }
    grouped[pathKey].layers.push(layer);
  }

  return { dataSets, groupedLayers: grouped };
}
