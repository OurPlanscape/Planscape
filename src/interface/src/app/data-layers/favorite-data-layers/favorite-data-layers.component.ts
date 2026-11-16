import { Component, Input, TemplateRef } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_CHECKBOX_DEFAULT_OPTIONS,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BehaviorSubject, combineLatest, map, of, switchMap } from 'rxjs';
import {
  ButtonComponent,
  EmptyStateComponent,
  HighlighterDirective,
  NoResultsComponent,
  SearchBarComponent,
  ToggleComponent,
} from '@styleguide';
import { DataLayer } from '@types';
import { unselectableReason } from '@app/shared';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayerTooltipComponent } from '@data-layers/data-layer-tooltip/data-layer-tooltip.component';
import { FavoriteStarComponent } from '@data-layers/favorite-star/favorite-star.component';
import { SingleOpenMenuDirective } from '@standalone/single-open-menu-directive/single-open-menu.directive';

export type FlatLayersSource = 'favorites' | 'uploaded';

const UPLOADED_COPY = {
  searchPlaceholder: 'Search in uploaded',
  errorTitle: "We couldn't load the uploaded layers",
  errorDescription:
    'The server could not return the uploads of this workspace. Try again later.',
  emptyIcon: 'drive_folder_upload',
  emptyTitle: 'No uploaded data layers yet',
};

const FAVORITES_COPY = {
  searchPlaceholder: 'Search in favorites',
  errorTitle: "We couldn't load your favorites",
  errorDescription:
    'The server could not return the favorites of this workspace. Try again later.',
  emptyIcon: 'star',
  emptyTitle: 'No favorite data layers yet',
};

/**
 * A flat, searchable list of a workspace's layers, one per map: its
 * favorites, or with `source="uploaded"` its ready uploads.
 */
@Component({
  selector: 'app-favorite-data-layers',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    NgTemplateOutlet,
    FormsModule,
    MatCheckboxModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ButtonComponent,
    DataLayerTooltipComponent,
    SingleOpenMenuDirective,
    EmptyStateComponent,
    HighlighterDirective,
    NoResultsComponent,
    SearchBarComponent,
    ToggleComponent,
    FavoriteStarComponent,
  ],
  templateUrl: './favorite-data-layers.component.html',
  styleUrl: './favorite-data-layers.component.scss',
  providers: [
    {
      provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
      useValue: { clickAction: 'noop' },
    },
  ],
})
export class FavoriteDataLayersComponent {
  @Input() belowSearch?: TemplateRef<unknown>;

  @Input() displayAddButton = false;

  @Input() set source(source: FlatLayersSource) {
    this.source$.next(source);
  }
  private source$ = new BehaviorSubject<FlatLayersSource>('favorites');

  infoMenuOpen = false;

  copy$ = this.source$.pipe(
    map((source) => (source === 'uploaded' ? UPLOADED_COPY : FAVORITES_COPY))
  );

  private _searchTerm$ = new BehaviorSubject('');
  searchTerm$ = this._searchTerm$.asObservable();

  layers$ = this.source$.pipe(
    switchMap((source) =>
      source === 'uploaded'
        ? this.dataLayersStateService.uploaded$
        : this.dataLayersStateService.favorites$
    )
  );

  results$ = combineLatest([this.layers$, this.searchTerm$]).pipe(
    map(([resource, term]) =>
      (resource.data ?? []).filter((layer) =>
        layer.name.toLowerCase().includes(term.trim().toLowerCase())
      )
    )
  );

  hasResults$ = this.results$.pipe(map((layers) => layers.length > 0));

  emptyStateDescription$ = this.source$.pipe(
    switchMap((source) =>
      source === 'uploaded'
        ? of(
            'Layers uploaded to this workspace show up here once they are processed.'
          )
        : this.dataLayersStateService.canEditFavorites$.pipe(
            map((canEdit) =>
              canEdit
                ? 'Favoriting data layers will help you define priority areas later in your planning process.'
                : 'There are no favorited layers in this workspace. Favorites added by owner and editors will appear here.'
            )
          )
    )
  );

  loadingDataLayer$ = this.dataLayersStateService.loadingLayer$;

  isSelectionCompleted$ = this.dataLayersStateService.selectedDataLayers$.pipe(
    map(
      (layers) =>
        layers.length === this.dataLayersStateService.getMaxSelectedLayers()
    )
  );

  viewedDataLayerId$ = this.dataLayersStateService.viewedDataLayer$.pipe(
    map((layer) => layer?.id)
  );

  constructor(protected dataLayersStateService: DataLayersStateService) {}

  trackById(_index: number, layer: DataLayer) {
    return layer.id;
  }

  search(term: string) {
    this._searchTerm$.next(term);
  }

  clearSearch() {
    this._searchTerm$.next('');
  }

  selectDataLayer(layer: DataLayer, event: Event) {
    const target = event.target as HTMLInputElement;
    this.dataLayersStateService.selectDataLayer(target.checked ? layer : null);
  }

  isSelected(layer: DataLayer) {
    return this.dataLayersStateService.isSelectedLayer(layer);
  }

  isUnselectable(layer: DataLayer) {
    return this.dataLayersStateService.isLayerUnselectable(layer);
  }

  toggleSelection(layer: DataLayer) {
    this.dataLayersStateService.handleLayerClick(layer);
  }

  getTooltipText(layer: DataLayer, isSelectionCompleted: boolean | null) {
    if (!this.isSelected(layer)) {
      const unselectable =
        this.dataLayersStateService.getUnselectableLayer(layer);
      if (unselectable) {
        return unselectableReason[unselectable.reason];
      }
      if (isSelectionCompleted) {
        return 'You have selected the maximum number of layers';
      }
    }
    return '';
  }
}
