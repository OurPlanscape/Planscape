import { Component } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ButtonComponent, SectionComponent } from '@styleguide';
import { DataLayer } from '@types';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MAX_CLIMATE_DATALAYERS } from '@shared';

/**
 * Data layer picker used when DATA_ORGANIZATION is off: a slide-over browser
 * opened from a Select button, with no rail, favorites or base layers.
 * Delete once DATA_ORGANIZATION is released.
 */
@Component({
  selector: 'app-legacy-data-layer-selection',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    ButtonComponent,
    SectionComponent,
    DataLayersComponent,
  ],
  templateUrl: './legacy-data-layer-selection.component.html',
  styleUrl: './legacy-data-layer-selection.component.scss',
})
export class LegacyDataLayerSelectionComponent {
  maxDataLayers = MAX_CLIMATE_DATALAYERS;

  isBrowserOpen = false;

  selectedCount$ = this.dataLayersState.selectedLayersCount$;

  selectedDataLayers$ = this.dataLayersState.selectedDataLayers$;

  constructor(private dataLayersState: DataLayersStateService) {}

  toggleBrowser(): void {
    this.isBrowserOpen = !this.isBrowserOpen;
  }

  removeDataLayer(layer: DataLayer): void {
    this.dataLayersState.removeSelectedLayer(layer);
  }
}
