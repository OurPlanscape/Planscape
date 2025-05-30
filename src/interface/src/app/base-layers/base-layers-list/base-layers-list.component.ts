import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { BaseLayer, CategorizedBaseLayers } from '@types';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BASE_LAYERS_DEFAULT } from '@shared';
import { BaseLayersStateService } from '../base-layers.state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-base-layers-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
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

  private baseLayerStateService: BaseLayersStateService = inject(
    BaseLayersStateService
  );

  expanded = false;

  BASE_LAYERS_DEFAULT = BASE_LAYERS_DEFAULT;

  loadingLayers$ = this.baseLayerStateService.loadingLayers$;

  onLayerChange(layer: any, isMulti: boolean): void {
    if (!isMulti) {
      this.baseLayerStateService.resetSourceIds();
    }
    this.layerSelected.emit({ layer, isMulti });
  }

  isSelectedLayer(id: number): boolean {
    return this.selectedLayersId.includes(id);
  }
}
