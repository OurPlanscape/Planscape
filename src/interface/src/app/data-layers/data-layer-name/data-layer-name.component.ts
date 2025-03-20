import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { DataLayersStateService } from '../data-layers.state.service';
import { DataLayer } from '@types';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-layer-name',
  standalone: true,
  imports: [CommonModule, MatIconModule, ButtonComponent],
  templateUrl: './data-layer-name.component.html',
  styleUrl: './data-layer-name.component.scss',
})
export class DataLayerNameComponent {
  constructor(private dataLayersStateService: DataLayersStateService) {}

  selectedDataLayer$ = this.dataLayersStateService.selectedDataLayer$;

  goToSelectedLayer(layer: DataLayer) {
    this.dataLayersStateService.goToSelectedLayer(layer);
  }
}
