import { Component } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import { FormsModule } from '@angular/forms';
import { DataLayer, DataSetSearchResult, IdNamePair } from '@types';
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

interface Category {
  path: string[];
  layers: DataSetSearchResult[];
}

/**
 * A single grouping structure for DATALAYERs,
 * keyed by a path-based string. Each group
 * also stores the actual path array for reference
 */
interface GroupedDatalayers {
  [groupName: string]: {
    org: IdNamePair;
    dataset: IdNamePair;
    categories: {
      [pathKey: string]: Category;
    };
  };
}

function groupSearchResults(results: DataSetSearchResult[]) {
  // Separate Datasets & DataLayers
  const dataSets = results.filter((r) => r.type === 'DATASET');
  const dataLayers = results.filter((r) => r.type === 'DATALAYER');

  // Group results by org first, and then categories
  const grouped = dataLayers.reduce((acc, value) => {
    const org = value.data.organization;
    const pathArr = (value.data as DataLayer).path || [];
    const pathKey = pathArr.join(' - ');
    const orgPath = org.id + '-' + org.name;

    // if no org create one
    if (!acc[orgPath]) {
      acc[orgPath] = {
        org: org,
        dataset: (value.data as DataLayer).dataset,
        categories: {},
      };
    }
    // if no category create one
    if (!acc[orgPath].categories[pathKey]) {
      acc[orgPath].categories[pathKey] = {
        path: pathArr,
        layers: [],
      };
    }
    // finally, push the layer
    acc[orgPath].categories[pathKey].layers.push(value);
    return acc;
  }, {} as GroupedDatalayers);

  // return datasets and grouped results
  return { dataSets, groupedLayers: grouped };
}
