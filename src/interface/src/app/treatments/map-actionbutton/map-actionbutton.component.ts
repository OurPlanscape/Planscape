import { Component, Input } from '@angular/core';
import { MapConfigState } from '../treatment-map/map-config.state';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [ControlComponent, MatIconModule, ButtonComponent, MatTooltipModule],
  templateUrl: './map-actionbutton.component.html',
  styleUrl: './map-actionbutton.component.scss',
})
export class MapActionButtonComponent {
  @Input() mapLibreMap!: MapLibreMap;
  constructor(private mapConfigState: MapConfigState) {}

  openLegend() {
    this.mapConfigState.setShowTreatmentLegend(true);
  }
}
