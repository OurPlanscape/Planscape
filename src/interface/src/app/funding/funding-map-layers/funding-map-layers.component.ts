import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';

export interface MapLayer {
  id: number;
  name: string;
}

/**
 * A single-select list of map layers, rendered as a radio group. Meant to live
 * inside a `.summary-card` (kept in the parent, since that wrapper is shared by
 * other report blocks). Emits the chosen layer on `selectedLayer`.
 */
@Component({
  selector: 'app-funding-map-layers',
  standalone: true,
  imports: [NgFor, MatRadioModule],
  templateUrl: './funding-map-layers.component.html',
  styleUrl: './funding-map-layers.component.scss',
})
export class FundingMapLayersComponent {
  @Input() heading = 'Map Layers';
  @Input() layers: MapLayer[] = [];
  @Output() selectedLayer = new EventEmitter<MapLayer>();
}
