import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-base-layers-list',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './base-layers-list.component.html',
  styleUrl: './base-layers-list.component.scss',
})
export class BaseLayersListComponent {
  // TODO change any for categorizedBaseLayers and remove default mocked value
  @Input() categorizedBaseLayer: any = {
    category: {
      name: 'Boundaries',
      key: 'boundaries',
      isMulti: true,
    },
    layers: [
      {
        id: 1,
        name: 'Watersheds (HUC-12)',
        category: '',
      },
      {
        id: 2,
        name: 'PODs',
        category: '',
      },
      {
        id: 3,
        name: 'Subfireshreds',
        category: '',
      },
    ],
  };
  // TODO: change any for baseLayer
  @Output() layerSelected = new EventEmitter<any>();
  // TODO: change any for BaseLayer[]
  @Output() layersSelected = new EventEmitter<any[]>();

  selectedLayers: any[] = [];
  expanded = false;

  onLayerChange(layer: any): void {
    this.layerSelected.emit(layer);
  }

  isLayerSelected(layer: any): boolean {
    return this.selectedLayers.some((l) => l.id === layer.id);
  }

  onCheckboxChange(layer: any, event: any): void {
    if (event?.target?.checked) {
      this.selectedLayers.push(layer);
    } else {
      this.selectedLayers = this.selectedLayers.filter(
        (l) => l.id !== layer.id
      );
    }

    this.layersSelected.emit(this.selectedLayers);
  }
}
