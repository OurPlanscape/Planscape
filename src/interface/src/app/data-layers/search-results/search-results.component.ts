import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DataLayer,
  DataLayerSearchResult,
  DataSet,
  DataSetSearchResult,
} from '@types';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent, SearchBarComponent } from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupedResults } from '../data-layers/search';
import { DataSetComponent } from '../data-set/data-set.component';

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
    DataSetComponent,
  ],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  constructor() {}

  @Input() results: {
    dataSets: DataSetSearchResult[];
    groupedLayers: GroupedResults;
  } | null = null;
  @Input() searchTerm = '';
  @Output() clickDataset = new EventEmitter<DataSet>();
  @Output() clickDataLayer = new EventEmitter<DataLayer>();

  goToDataSet(result: DataSetSearchResult) {
    this.clickDataset.emit(result.data);
  }

  goToDataLayerDataSet(result: DataLayerSearchResult[]) {
    this.clickDataLayer.emit(result[0].data);
  }
}
