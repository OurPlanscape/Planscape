import { OverlayRef } from '@angular/cdk/overlay';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { ClickOutsideDirective } from 'src/app/treatments/click-outside.directive';
import {
  baseLayerStyles,
  BaseLayerType,
} from 'src/app/treatments/treatment-map/map-base-layers';
import { MapConfigState } from 'src/app/treatments/treatment-map/map-config.state';

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
  ],
  templateUrl: './map-base-dropdown.component.html',
  styleUrl: './map-base-dropdown.component.scss',
})
export class MapBaseDropdownComponent {
  displayed = false;

  selectedLayer$ = this.mapConfigState.baseLayer$;
  baseLayers = Object.keys(baseLayerStyles) as BaseLayerType[];
  overlayRef!: OverlayRef | null;
  selectedLayerImage = 'assets/png/baseMaps/roadmap.png';

  constructor(private mapConfigState: MapConfigState) {}

  updateBaseMapLayer(baseLayer: BaseLayerType) {
    this.mapConfigState.updateBaseLayer(baseLayer);
    this.closeOverlay();
  }

  openOverlay(event: Event) {
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
