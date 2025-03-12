import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataSet, DataSetSearchResult } from '@types';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent, SearchBarComponent } from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupedDataLayers, GroupedResults } from '../data-layers/search';
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
  @Output() clickDataset = new EventEmitter<DataSet>();

  goToDataSet(result: DataSetSearchResult) {
    this.clickDataset.emit(result.data);
  }

  goToDataLayerDataSet(result: GroupedDataLayers) {
    // need do do a partial DataSet from pieces...
    const dataSet: Partial<DataSet> = {
      ...result.dataset,
      organization: result.org,
    };
    this.clickDataset.emit(dataSet as DataSet);
  }
}
