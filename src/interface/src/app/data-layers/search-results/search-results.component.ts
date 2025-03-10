import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataLayer, DataSetSearchResult } from '@types';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent, SearchBarComponent } from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupedDatalayers } from '../data-layers/search';

@Component({
  selector: 'app-search-results',
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
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  constructor() {}

  @Input() results: {
    dataSets: DataSetSearchResult[];
    groupedLayers: GroupedDatalayers;
  } | null = null;

  getPath(result: DataSetSearchResult) {
    return (result.data as DataLayer).path.join('-');
  }

  goToDataSet(id: number) {
    // navigate to the dataset somehow.
  }
}
