import { Component, Input } from '@angular/core';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { AsyncPipe, NgClass, NgForOf } from '@angular/common';
import { MapConfigState } from '../treatment-map/map-config.state';
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
import { Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [
    NgForOf,
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
  @Input() mapLibreMap!: MapLibreMap;
  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;

  constructor(
    private selectedStandsState: SelectedStandsState,
    private mapConfigState: MapConfigState
  ) {}

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

  undoLastAction() {
    this.selectedStandsState.undo();
  }

  clearAll() {
    this.selectedStandsState.clearStands();
  }
}
