import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import {
  DraggableDirective,
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  PopupComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

import {
  LngLat,
  Map as MapLibreMap,
  MapMouseEvent,
  MapSourceDataEvent,
} from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { environment } from '../../../environments/environment';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapConfigState } from './map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatIconModule } from '@angular/material/icon';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { BehaviorSubject, map, withLatestFrom } from 'rxjs';

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
    MatIconModule,
    PopupComponent,
    MapTooltipComponent,
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

  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;
  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;
  bounds$ = this.mapConfigState.mapCenter$;
  standsLoaded = new BehaviorSubject(false);

  showMapProjectAreas$ = this.standsLoaded.pipe(
    withLatestFrom(this.mapConfigState.showProjectAreasLayer$),
    map(([bounds, showAreas]) => showAreas) // Pass only the showProjectAreas$ value forward
  );

  showTreatmentStands$ = this.mapConfigState.showTreatmentStandsLayer$;
  showMapControls$ = this.mapConfigState.showMapControls$;
  mouseLngLat: LngLat | null = null;

  constructor(private mapConfigState: MapConfigState) {
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
    if (this.mapConfigState.isStandSelectionEnabled()) {
      this.mouseLngLat = event.lngLat;
    } else {
      this.mouseLngLat = null;
    }

    if (!this.drawingSelection) return;
    this.mouseEnd = event;
  }

  onMapMouseUp(): void {
    if (!this.drawingSelection) return;
    this.drawingSelection = false;
    this.mouseStart = null;
    this.mouseEnd = null;
  }

  onSourceData(event: MapSourceDataEvent) {
    if (event.sourceId === 'stands' && event.isSourceLoaded) {
      this.standsLoaded.next(true);
    }
  }
}
