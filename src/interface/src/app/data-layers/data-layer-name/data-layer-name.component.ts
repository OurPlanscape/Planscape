import { Component, Input } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { DataLayersStateService } from '../data-layers.state.service';
import { DataLayer } from '@types';
import { FeatureService } from '@features/feature.service';
import { FeaturesModule } from '@features/features.module';

@Component({
  selector: 'app-data-layer-name',
  standalone: true,
  imports: [AsyncPipe, MatIconModule, NgIf, ButtonComponent, FeaturesModule],
  templateUrl: './data-layer-name.component.html',
  styleUrl: './data-layer-name.component.scss',
})
export class DataLayerNameComponent {
  constructor(
    private dataLayersStateService: DataLayersStateService,
    private featureService: FeatureService
  ) {}

  @Input() showClearButton = false;

  // DATA_ORGANIZATION moves the sidebar's clear button here, on every map.
  get clearable() {
    return (
      this.showClearButton ||
      this.featureService.isFeatureEnabled('DATA_ORGANIZATION')
    );
  }

  viewedDataLayer$ = this.dataLayersStateService.viewedDataLayer$;

  goToViewedLayer(layer: DataLayer) {
    this.dataLayersStateService.goToSelectedLayer(layer);
  }

  clearViewedDataLayer(event: Event) {
    // don't also trigger the name's goToViewedLayer
    event.stopPropagation();
    this.dataLayersStateService.clearViewedDataLayer();
  }
}
