import { Component, Input } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { MapConfigState } from '../../maplibre-map/map-config.state';
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
import { Map as MapLibreMap, ControlPosition } from 'maplibre-gl';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    AsyncPipe,
    ControlComponent,
    GeolocateControlDirective,
    ScaleControlDirective,
    NavigationControlDirective,
    TerrainControlDirective,
    MatIconModule,
    ButtonComponent,
    MatTooltipModule,
    NgClass,
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
  @Input() panEnabled: boolean = true;

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
