import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DataLayer, DataLayerSearchResult } from '@types';
import { ButtonComponent, HighlighterDirective } from '@styleguide';
import { MatRadioModule } from '@angular/material/radio';
import { DataLayersStateService } from '../data-layers.state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { DataLayerTooltipComponent } from '@data-layers/data-layer-tooltip/data-layer-tooltip.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { unselectableReason } from '@app/shared';

@Component({
  selector: 'app-data-set',
  standalone: true,
  imports: [
    NgForOf,
    MatIconModule,
    ButtonComponent,
    NgIf,
    NgClass,
    MatProgressSpinnerModule,
    MatRadioModule,
    HighlighterDirective,
    AsyncPipe,
    MatMenuModule,
    DataLayerTooltipComponent,
    MatTooltipModule,
  ],
  templateUrl: './data-set.component.html',
  styleUrl: './data-set.component.scss',
})
export class DataSetComponent {
  @Input() name = '';
  @Input() organizationName = '';
  @Input() layers?: DataLayerSearchResult[];
  @Input() path?: string[];
  @Input() searchTerm = '';
  @Input() displayAddButton = false;

  @Output() selectDataset = new EventEmitter<void>();

  loadingDataLayer$ = this.dataLayersStateService.loadingLayer$;

  selectedDataLayerId$ = this.dataLayersStateService.viewedDataLayer$.pipe(
    map((dl) => dl?.id)
  );

  displayTooltipLayer = false;

  isSelectionCompleted$ = this.dataLayersStateService.selectedDataLayers$.pipe(
    map(
      (layers) =>
        layers.length === this.dataLayersStateService.getMaxSelectedLayers()
    )
  );

  isUnselectable(layer: DataLayer) {
    return this.dataLayersStateService.isLayerUnselectable(layer);
  }

  getUnselectableReason(layer: DataLayer): string {
    const uLayer = this.dataLayersStateService.getUnselectableLayer(layer);
    return uLayer ? unselectableReason[uLayer.reason] : 'Cannot be selected.';
  }

  getTooltipText(
    layer: DataLayer,
    isSelectionCompleted: boolean | null
  ): string {
    if (!this.isDatalayerSelected(layer)) {
      if (this.isUnselectable(layer)) {
        return this.getUnselectableReason(layer);
      }
      if (isSelectionCompleted) {
        return 'You have selected the maximum number of layers';
      }
    }
    return '';
  }

  constructor(private dataLayersStateService: DataLayersStateService) {}

  selectDataLayer(dataLayer: DataLayer) {
    this.dataLayersStateService.selectDataLayer(dataLayer);
  }

  isDatalayerSelected(layer: DataLayer) {
    return this.dataLayersStateService.isSelectedLayer(layer);
  }

  toggleDataLayerSelection(dl: DataLayer) {
    this.dataLayersStateService.toggleLayerAdition(dl);
  }
}
