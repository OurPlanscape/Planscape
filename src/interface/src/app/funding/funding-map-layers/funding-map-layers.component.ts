import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BASE_LAYERS_DEFAULT } from '@shared';

export interface MapLayer {
  id: number;
  name: string;
  /** Fill color for the legend swatch (multi-select / vector layers only). */
  color?: string;
  /** Outline color for the legend swatch (multi-select / vector layers only). */
  outlineColor?: string;
}

/**
 * A list of map layers. Single-select (the default) renders a radio group for
 * raster data layers; multi-select renders checkboxes with a color swatch for
 * vector base layers, like the Ownership base layers. Meant to live inside a
 * `.summary-card` (kept in the parent, since that wrapper is shared by other
 * report blocks). Emits the chosen/toggled layer on `selectedLayer`.
 */
@Component({
  selector: 'app-funding-map-layers',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './funding-map-layers.component.html',
  styleUrl: './funding-map-layers.component.scss',
})
export class FundingMapLayersComponent {
  @Input() heading = 'Map Layers';
  @Input() layers: MapLayer[] = [];
  /** When true, render checkboxes (multi-select) instead of a radio group. */
  @Input() multiSelect = false;
  /** Id of the single layer currently shown on the map, or null when none is. */
  @Input() selectedLayerId: number | null = null;
  /** Ids of the layers currently shown on the map (multi-select). */
  @Input() selectedLayerIds: number[] = [];
  /** Ids of the layers currently loading onto the map; each shows a spinner. */
  @Input() loadingLayerIds: number[] = [];
  @Output() selectedLayer = new EventEmitter<MapLayer>();

  BASE_LAYERS_DEFAULT = BASE_LAYERS_DEFAULT;

  /**
   * The layer in this group matching `selectedLayerId`, used as the radio
   * group's value. Returns null when the active layer belongs to another
   * section, which leaves this group unselected.
   */
  get selected(): MapLayer | null {
    return (
      this.layers.find((layer) => layer.id === this.selectedLayerId) ?? null
    );
  }

  isChecked(layer: MapLayer): boolean {
    return this.selectedLayerIds.includes(layer.id);
  }

  isLoading(layer: MapLayer): boolean {
    return this.loadingLayerIds.includes(layer.id);
  }
}
