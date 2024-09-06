import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import {
  DraggableDirective,
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

import { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { environment } from '../../../environments/environment';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapConfigState } from './map-config.state';
import { TreatedStandsState } from './treated-stands.state';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-treatment-map',
  standalone: true,
  imports: [
    JsonPipe,
    NgForOf,
    MapComponent,
    VectorSourceComponent,
    LayerComponent,
    FeatureComponent,
    DraggableDirective,
    GeoJSONSourceComponent,
    MapStandsComponent,
    MapRectangleComponent,
    MapControlsComponent,
    MapProjectAreasComponent,
    NgIf,
    AsyncPipe,
  ],
  templateUrl: './treatment-map.component.html',
  styleUrl: './treatment-map.component.scss',
})
export class TreatmentMapComponent {
  mapLibreMap!: MapLibreMap;
  readonly key = environment.stadiamaps_key;

  mapDragging = true;

  private isDragging = false;
  start: MapMouseEvent | null = null;
  end: MapMouseEvent | null = null;

  styleUrl$ = this.mapConfigState.baseLayerUrl$;

  treatedStands$ = this.treatedStandsState.treatedStands$;

  // this is not great, as I need to clean up the previous bounds$ value...hmmmm
  bounds$ = this.mapConfigState.mapCenter$.pipe(filter((c) => !!c));

  showMapProjectAreas$ = this.mapConfigState.showProjectAreas$;

  constructor(
    private mapConfigState: MapConfigState,
    private treatedStandsState: TreatedStandsState
  ) {}

  onMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button === 2) {
      return;
    }
    if (this.mapDragging) {
      return;
    }
    this.isDragging = true;

    this.start = event;
    this.mapLibreMap.getCanvas().style.cursor = 'crosshair';
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.end = event;
  }

  onMapMouseUp(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.mapLibreMap.getCanvas().style.cursor = '';
    this.start = null;
    this.end = null;
  }
}
