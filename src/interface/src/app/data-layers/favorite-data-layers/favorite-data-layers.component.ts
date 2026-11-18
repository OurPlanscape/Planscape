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
import { BehaviorSubject, combineLatest, map } from 'rxjs';
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
  infoMenuOpen = false;

  private _searchTerm$ = new BehaviorSubject('');
  searchTerm$ = this._searchTerm$.asObservable();

  favorites$ = this.dataLayersStateService.favorites$;

  results$ = combineLatest([this.favorites$, this.searchTerm$]).pipe(
    map(([resource, term]) =>
      (resource.data ?? []).filter((layer) =>
        layer.name.toLowerCase().includes(term.trim().toLowerCase())
      )
    )
  );

  hasResults$ = this.results$.pipe(map((layers) => layers.length > 0));

  emptyStateDescription$ = this.dataLayersStateService.canEditFavorites$.pipe(
    map((canEdit) =>
      canEdit
        ? 'Favoriting data layers will help you define priority areas later in your planning process.'
        : 'There are no favorited layers in this workspace. Favorites added by owner and editors will appear here.'
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
