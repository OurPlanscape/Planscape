import { Component, Input } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import {
  DraggableDirective,
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

import { Map as MapLibreMap, MapMouseEvent, MapOptions } from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { SelectedStandsState } from './selected-stands.state';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { environment } from '../../../environments/environment';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapConfigState } from './map-config.state';

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
  providers: [SelectedStandsState],
  templateUrl: './treatment-map.component.html',
  styleUrl: './treatment-map.component.scss',
})
export class TreatmentMapComponent {
  mapLibreMap!: MapLibreMap;
  readonly key = environment.stadiamaps_key;

  // TODO: should we keep using prop drilling here? Consider using a provider service to hold these values
  @Input() projectAreaId: number | null = null;
  @Input() treatmentPlanId = 0;
  @Input() scenarioId: number | null = null;

  treatedStands: { id: number; assigment: string }[] = [];

  mapDragging = true;

  private isDragging = false;
  start: MapMouseEvent | null = null;
  end: MapMouseEvent | null = null;

  styleUrl = this.mapConfigState.baseLayerUrl$;

  constructor(private mapConfigState: MapConfigState) {}

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

  esri: MapOptions['style'] = {
    version: 8,
    sources: {
      'esri-world-imagery': {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'esri-world-imagery-layer',
        type: 'raster',
        source: 'esri-world-imagery',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}
