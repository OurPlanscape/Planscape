import { Component, Input } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Observable, of } from 'rxjs';
import { DataLayer } from '@types';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';

/**
 * Star that adds a data layer to the favorites of the workspace, or takes it
 * out. It renders nothing where favoriting does not apply, so the rows that
 * include it do not have to know about the feature flag.
 */
@Component({
  selector: 'app-favorite-star',
  standalone: true,
  imports: [NgIf, AsyncPipe, MatIconModule],
  templateUrl: './favorite-star.component.html',
  styleUrl: './favorite-star.component.scss',
})
export class FavoriteStarComponent {
  @Input({ required: true }) set layer(layer: DataLayer) {
    this._layer = layer;
    this.isFavorite$ = this.dataLayersStateService.isFavorite$(layer);
  }

  get layer(): DataLayer {
    return this._layer;
  }

  private _layer!: DataLayer;

  isFavorite$: Observable<boolean> = of(false);

  constructor(private dataLayersStateService: DataLayersStateService) {}

  get enabled(): boolean {
    return this.dataLayersStateService.favoritesEnabled();
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.dataLayersStateService.toggleFavorite(this.layer);
  }
}
