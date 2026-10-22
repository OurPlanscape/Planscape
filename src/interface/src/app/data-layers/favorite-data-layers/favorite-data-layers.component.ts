import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import {
  EmptyStateComponent,
  HighlighterDirective,
  NoResultsComponent,
  SearchBarComponent,
  ToggleComponent,
} from '@styleguide';
import { DataLayer } from '@types';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { FavoriteStarComponent } from '@data-layers/favorite-star/favorite-star.component';

@Component({
  selector: 'app-favorite-data-layers',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    HighlighterDirective,
    NoResultsComponent,
    SearchBarComponent,
    ToggleComponent,
    FavoriteStarComponent,
  ],
  templateUrl: './favorite-data-layers.component.html',
  styleUrl: './favorite-data-layers.component.scss',
})
export class FavoriteDataLayersComponent {
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

  loadingDataLayer$ = this.dataLayersStateService.loadingLayer$;

  viewedDataLayerId$ = this.dataLayersStateService.viewedDataLayer$.pipe(
    map((layer) => layer?.id)
  );

  constructor(private dataLayersStateService: DataLayersStateService) {}

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
}
