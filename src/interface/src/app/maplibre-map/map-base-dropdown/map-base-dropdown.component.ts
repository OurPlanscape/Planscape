import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { ClickOutsideDirective } from 'src/app/standalone/click-outside-directive/click-outside.directive';
import { baseLayerStyles } from 'src/app/maplibre-map/map-base-layers';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseLayerType } from '../../types/maplibre.map.types';

@Component({
  selector: 'app-map-base-dropdown',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    MatCardModule,
    AsyncPipe,
    MatIconModule,
    ButtonComponent,
    ClickOutsideDirective,
    MatTooltipModule,
  ],
  templateUrl: './map-base-dropdown.component.html',
  styleUrl: './map-base-dropdown.component.scss',
})
export class MapBaseDropdownComponent {
  displayed = false;
  selectedLayer$ = this.mapConfigState.baseLayer$;
  baseLayers = Object.keys(baseLayerStyles) as BaseLayerType[];

  constructor(private mapConfigState: MapConfigState) {}

  updateBaseMapLayer(baseLayer: BaseLayerType) {
    this.mapConfigState.updateBaseLayer(baseLayer);
    this.closeOverlay();
  }

  openOverlay(event: Event): void {
    this.displayed = !this.displayed;
    // We need to stop propagation to prevent the clickOutside directive to fire while opening
    if (this.displayed) {
      event.stopPropagation();
    }
  }

  closeOverlay(): void {
    this.displayed = false;
  }
}
