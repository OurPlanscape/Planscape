import { Component, Input } from '@angular/core';
import { MapConfigState } from '../map-config.state';
import {
  ControlComponent,
  GeolocateControlDirective,
  NavigationControlDirective,
  ScaleControlDirective,
  TerrainControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ControlPosition, Map as MapLibreMap } from 'maplibre-gl';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [
    CommonModule,
    ControlComponent,
    GeolocateControlDirective,
    ScaleControlDirective,
    NavigationControlDirective,
    TerrainControlDirective,
    MatIconModule,
    ButtonComponent,
    MatTooltipModule,
  ],
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
})
export class MapControlsComponent {
  constructor(private mapConfigState: MapConfigState) {}

  @Input() mapLibreMap!: MapLibreMap;
  @Input() controlsPosition: ControlPosition = 'top-left';
  @Input() userCanEditStands: boolean = false;
  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;
  @Input() extendedControlsEnabled: boolean = true;

  zoomIn() {
    this.mapLibreMap.zoomIn();
  }

  zoomOut() {
    this.mapLibreMap.zoomOut();
  }

  toggleRxSelection() {
    this.mapConfigState.setStandSelectionEnabled(true);
  }

  togglePan() {
    this.mapConfigState.setStandSelectionEnabled(false);
  }
}
