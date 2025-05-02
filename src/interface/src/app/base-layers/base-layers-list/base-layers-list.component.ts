import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BaseLayer, CategorizedBaseLayers } from '@types';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-base-layers-list',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, MatRadioModule, MatCheckboxModule],
  templateUrl: './base-layers-list.component.html',
  styleUrl: './base-layers-list.component.scss',
})
export class BaseLayersListComponent {
  @Input() categorizedBaseLayer!: CategorizedBaseLayers;
  @Input() selectedLayersId: number[] = [];

  @Output() layerSelected = new EventEmitter<{
    layer: BaseLayer;
    isMulti: boolean;
  }>();

  expanded = false;

  onLayerChange(layer: any, isMulti: boolean): void {
    this.layerSelected.emit({ layer, isMulti });
  }

  isSelectedLayer(id: number): boolean {
    return this.selectedLayersId.includes(id);
  }
}
