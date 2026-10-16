import { Component, Input } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { DataSetSearchResult, SimpleCategory } from '@types';
import { DataSetComponent } from '@data-layers/data-set/data-set.component';
import { DataLayersStateService } from '../data-layers.state.service';
import { CategoryGroup, CategoryResults } from './category-search';

@Component({
  selector: 'app-category-search-results',
  standalone: true,
  imports: [NgForOf, NgIf, DataSetComponent],
  templateUrl: './category-search-results.component.html',
})
export class CategorySearchResultsComponent {
  constructor(private dataLayersStateService: DataLayersStateService) {}

  @Input() results: CategoryResults | null = null;
  @Input() searchTerm = '';
  @Input() displayAddButton = false;

  goToCategory(category: SimpleCategory) {
    this.dataLayersStateService.resetPath();
    this.dataLayersStateService.selectCategory(category);
  }

  goToDataSet(result: DataSetSearchResult) {
    this.dataLayersStateService.selectDataSet(result.data);
  }

  goToGroup(group: CategoryGroup) {
    if (group.category) {
      this.goToCategory(group.category);
    } else {
      // no category to browse, fall back to the layer's dataset
      this.dataLayersStateService.resetPath();
      this.dataLayersStateService.goToDataLayerCategory(group.layers[0].data);
    }
  }
}
