import {
  AsyncPipe,
  NgClass,
  NgForOf,
  NgIf,
  NgTemplateOutlet,
} from '@angular/common';
import { Component, HostBinding, Input, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCommonModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatTreeModule } from '@angular/material/tree';
import { DataLayerTreeComponent } from '@data-layers/data-layer-tree/data-layer-tree.component';
import { DataSetComponent } from '@data-layers/data-set/data-set.component';
import { SearchResultsComponent } from '@data-layers/search-results/search-results.component';
import { CategorySearchResultsComponent } from '@data-layers/category-search-results/category-search-results.component';
import {
  CategoryResults,
  groupSearchResultsByCategory,
} from '@data-layers/category-search-results/category-search';
import { UntilDestroy } from '@ngneat/until-destroy';
import {
  ButtonComponent,
  ExpanderSectionComponent,
  NoResultsComponent,
  PaginatorComponent,
  SearchBarComponent,
} from '@styleguide';
import { BaseDataSet, SimpleCategory } from '@types';
import { FeatureService } from '@features/feature.service';
import { FeaturesModule } from '@features/features.module';
import {
  catchError,
  combineLatest,
  map,
  Observable,
  startWith,
  tap,
  throwError,
} from 'rxjs';
import { DataLayersStateService } from '../data-layers.state.service';
import { groupSearchResults, Results } from './search';

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
    CategorySearchResultsComponent,
    DataSetComponent,
    NoResultsComponent,
    MatRadioModule,
    FormsModule,
    PaginatorComponent,
    FeaturesModule,
    NgTemplateOutlet,
  ],
  templateUrl: './data-layers.component.html',
  styleUrls: ['./data-layers.component.scss'],
})
export class DataLayersComponent {
  @Input() displayAddButton = false;
  @Input() useClearFooter = true;
  // Off when the host renders the back navigation itself (map viewer panel header).
  @Input() showSelectionHeader = true;
  // Rendered between the search bar and the list (map viewer map tabs)
  @Input() belowSearch?: TemplateRef<unknown>;

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private featureService: FeatureService
  ) {}

  // With DATA_ORGANIZATION the clear button lives on the map's layer name instead.
  showClearButton = !this.featureService.isFeatureEnabled('DATA_ORGANIZATION');
  @HostBinding('class.data-organization')
  browseByCategory = this.featureService.isFeatureEnabled('DATA_ORGANIZATION');
  searchPlaceholder = this.browseByCategory
    ? 'Search in data layers'
    : 'Search by dataset, metric, category, org...';

  loading$ = this.dataLayersStateService.loading$;

  dataSets$ = this.dataLayersStateService.dataSets$;
  categories$ = this.dataLayersStateService.categories$;

  selection$ = this.dataLayersStateService.selection$;
  viewedDataLayer$ = this.dataLayersStateService.viewedDataLayer$;

  searchTerm$ = this.dataLayersStateService.searchTerm$.pipe(
    tap(() => {
      // reset count when the search term changes
      this.resultCount = 0;
    })
  );
  resultCount: number | null = null;

  searchResults$ = this.dataLayersStateService.searchResults$.pipe(
    startWith(null),
    tap((results) => {
      if (results) {
        this.resultCount = results.count;
      }
    }),
    catchError((err) => {
      // TODO handle errors
      return throwError(() => err);
    })
  );

  results$: Observable<Results | null> = this.searchResults$.pipe(
    map((results) => results && groupSearchResults(results.results))
  );

  categoryResults$: Observable<CategoryResults | null> =
    this.searchResults$.pipe(
      map((results) => results && groupSearchResultsByCategory(results.results))
    );

  hasNoData$ = this.dataLayersStateService.hasNoTreeData$;
  isBrowsing$ = this.dataLayersStateService.isBrowsing$;

  showFooter$ = combineLatest([
    this.searchResults$,
    this.viewedDataLayer$,
  ]).pipe(
    map(
      ([results, selectedLayer]) =>
        this.pages > 1 || (this.showClearButton && selectedLayer)
    )
  );

  showDatasets$ = combineLatest([this.dataSets$, this.loading$]).pipe(
    map(([dataSets, loading]) => {
      return dataSets.length > 0 && !loading;
    })
  );

  showCategories$ = combineLatest([this.categories$, this.loading$]).pipe(
    map(([categories, loading]) => categories.length > 0 && !loading)
  );

  get pages() {
    return this.resultCount
      ? Math.ceil(this.resultCount / this.dataLayersStateService.limit)
      : 0;
  }

  search(term: string) {
    this.dataLayersStateService.search(term);
  }

  showPage(page: number) {
    this.dataLayersStateService.changePage(page);
  }

  viewDatasetCategories(dataSet: BaseDataSet) {
    this.dataLayersStateService.resetPath();
    this.dataLayersStateService.selectDataSet(dataSet);
  }

  viewCategoryLayers(category: SimpleCategory) {
    this.dataLayersStateService.resetPath();
    this.dataLayersStateService.selectCategory(category);
  }

  goBack() {
    this.dataLayersStateService.goBackToSearchResults();
  }

  clearSearch() {
    this.dataLayersStateService.clearSearch();
  }

  clearViewedDataLayer() {
    this.dataLayersStateService.clearViewedDataLayer();
  }
}
