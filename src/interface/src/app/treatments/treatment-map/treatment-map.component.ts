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
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
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
  readonly key = environment.stadiamaps_key;
  mapLibreMap!: MapLibreMap;

  private drawingSelection = false;
  mouseStart: MapMouseEvent | null = null;
  mouseEnd: MapMouseEvent | null = null;

  // TODO remove and do this directly on treatment-stands
  treatedStands$ = this.treatedStandsState.treatedStands$;

  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;
  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;
  bounds$ = this.mapConfigState.mapCenter$;
  showMapProjectAreas$ = this.mapConfigState.showProjectAreasLayer$;
  showTreatmentStands$ = this.mapConfigState.showTreatmentStandsLayer$;
  showMapControls$ = this.mapConfigState.showMapControls$;

  constructor(
    private mapConfigState: MapConfigState,
    private treatedStandsState: TreatedStandsState
  ) {
    // update cursor on map
    this.mapConfigState.cursor$
      .pipe(untilDestroyed(this))
      .subscribe((cursor) => {
        if (this.mapLibreMap) {
          this.mapLibreMap.getCanvas().style.cursor = cursor;
        }
      });
  }

  onMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button === 2) {
      return;
    }
    if (!this.mapConfigState.isStandSelectionEnabled()) {
      return;
    }
    this.drawingSelection = true;

    this.mouseStart = event;
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (!this.drawingSelection) return;
    this.mouseEnd = event;
  }

  onMapMouseUp(event: MapMouseEvent): void {
    if (!this.drawingSelection) return;
    this.drawingSelection = false;
    this.mouseStart = null;
    this.mouseEnd = null;
  }
}
