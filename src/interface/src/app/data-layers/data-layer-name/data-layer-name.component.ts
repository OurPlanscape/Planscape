import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { DataLayersStateService } from '../data-layers.state.service';
import { DataLayer } from '@types';

@Component({
  selector: 'app-data-layer-name',
  standalone: true,
  imports: [AsyncPipe, MatIconModule, NgIf, ButtonComponent],
  templateUrl: './data-layer-name.component.html',
  styleUrl: './data-layer-name.component.scss',
})
export class DataLayerNameComponent {
  constructor(private dataLayersStateService: DataLayersStateService) {}

  viewedDataLayer$ = this.dataLayersStateService.viewedDataLayer$;

  goToViewedLayer(layer: DataLayer) {
    this.dataLayersStateService.goToSelectedLayer(layer);
  }

  clearDataLayer() {
    this.dataLayersStateService.clearDataLayer();
  }
}
