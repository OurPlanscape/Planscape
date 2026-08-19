import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToggleComponent } from '@styleguide';
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
 * A list of map layers. Single-select (the default) renders one toggle per
 * raster data layer, only one of which can be on at a time; multi-select
 * renders checkboxes with a color swatch for vector base layers, like the
 * Ownership base layers. Meant to live inside a `.summary-card` (kept in the
 * parent, since that wrapper is shared by other report blocks). Emits the
 * chosen/toggled layer on `selectedLayer`, and — single-select only — the
 * layer switched off on `clearedLayer`.
 */
@Component({
  selector: 'app-funding-map-layers',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgTemplateOutlet,
    ToggleComponent,
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
  /**
   * True while the layer list itself is still being fetched, which shows a
   * placeholder in place of the list. Distinct from `loadingLayerIds`, which is
   * about a known layer being drawn onto the map.
   */
  @Input() loading = false;
  @Output() selectedLayer = new EventEmitter<MapLayer>();
  /** Emitted when a single-select layer is toggled back off. */
  @Output() clearedLayer = new EventEmitter<MapLayer>();

  BASE_LAYERS_DEFAULT = BASE_LAYERS_DEFAULT;

  /**
   * Whether this layer is the one currently on the map. False for every layer
   * in the group when the active layer belongs to another section, which leaves
   * all of this group's toggles off.
   */
  isSelected(layer: MapLayer): boolean {
    return layer.id === this.selectedLayerId;
  }

  /**
   * Single-select toggles: switching one on emits it (the parent swaps the
   * viewed layer, which turns the previous one off), switching one off clears
   * the map.
   */
  onToggled(layer: MapLayer, checked: boolean): void {
    if (checked) {
      this.selectedLayer.emit(layer);
    } else {
      this.clearedLayer.emit(layer);
    }
  }

  isChecked(layer: MapLayer): boolean {
    return this.selectedLayerIds.includes(layer.id);
  }

  isLoading(layer: MapLayer): boolean {
    return this.loadingLayerIds.includes(layer.id);
  }
}
