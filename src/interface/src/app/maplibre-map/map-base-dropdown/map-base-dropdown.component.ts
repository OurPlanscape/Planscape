import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { ClickOutsideDirective } from '@app/standalone/click-outside-directive/click-outside.directive';
import { baseMapStyles } from '@app/maplibre-map/map-base-layers';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseMapType } from '@types';

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
  selectedBaseMap$ = this.mapConfigState.baseMap$;
  baseMaps = Object.keys(baseMapStyles) as BaseMapType[];

  constructor(private mapConfigState: MapConfigState) {}

  updateBaseMap(baseLayer: BaseMapType) {
    this.mapConfigState.updateBaseMap(baseLayer);
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
