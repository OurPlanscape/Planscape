import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataLayerSearchResult, DataSetSearchResult } from '@types';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent, SearchBarComponent } from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupedResults } from '../data-layers/search';
import { DataSetComponent } from '../data-set/data-set.component';
import { DataLayersStateService } from '../data-layers.state.service';

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
  constructor(private dataLayersStateService: DataLayersStateService) {}

  @Input() results: {
    dataSets: DataSetSearchResult[];
    groupedLayers: GroupedResults;
  } | null = null;
  @Input() searchTerm = '';

  goToDataSet(result: DataSetSearchResult) {
    this.dataLayersStateService.selectDataSet(result.data);
  }

  goToDataLayerDataSet(result: DataLayerSearchResult[]) {
    this.dataLayersStateService.resetPath();
    this.dataLayersStateService.goToDataLayerCategory(result[0].data);
  }
}
