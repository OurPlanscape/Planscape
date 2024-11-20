import { Component, Input } from '@angular/core';
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
  RequestTransformFunction,
} from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapConfigState } from './map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatIconModule } from '@angular/material/icon';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { BehaviorSubject, map, withLatestFrom } from 'rxjs';
import { AuthService } from '@services';
import { TreatmentsState } from '../treatments.state';
import { addAuthHeaders } from '../maplibre.helper';
import { TreatmentAreaLayerComponent } from '../treatment-area-layer/treatment-area-layer.component';

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
    TreatmentAreaLayerComponent
  ],
  templateUrl: './treatment-map.component.html',
  styleUrl: './treatment-map.component.scss',
})
export class TreatmentMapComponent {
  @Input() showProjectAreaTooltips = true;
  /**
   * Flag to determine if the user is currently dragging to select stands
   */
  private dragStandsSelection = false;

  /**
   * Observable that provides values when the stands are loaded.
   */
  private standsLoaded$ = new BehaviorSubject(false);

  /**
   * Starting point for dragging selection
   */
  mouseStart: MapMouseEvent | null = null;

  /**
   * End point for dragging selection
   */
  mouseEnd: MapMouseEvent | null = null;

  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;

  /**
   * Observable that provides the currently selected stands by the user
   */
  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;

  /**
   * Observable that provides the map extent (bounds) for the treatment plan or project area
   */
  mapExtent$ = this.mapConfigState.mapExtent$;

  /**
   * Observable to determine if we show the map project area layer.
   * It uses the `standsLoaded$` as the trigger to re-check the value provided on
   * `mapConfigState`
   */
  showMapProjectAreas$ = this.standsLoaded$.pipe(
    withLatestFrom(this.mapConfigState.showProjectAreasLayer$),
    map(([bounds, showAreas]) => showAreas) // Pass only the showProjectAreas$ value forward
  );

  showFillProjectAreas$ = this.mapConfigState.showFillProjectAreas$;
  /**
   * Observable to determine if we show the treatment stands layer
   */
  showTreatmentStands$ = this.mapConfigState.showTreatmentStandsLayer$;
  /**
   * Observable to determine if we show the map controls
   */
  showMapControls$ = this.mapConfigState.showMapControls$;

  /**
   * The LongLat position of the helper tooltip attached to the mouse cursor when selecting stands.
   * If null, the tooltip is hidden.
   */
  treatmentTooltipLngLat: LngLat | null = null;

  /**
   * The name of the source layer used to load stands, and later check if loaded
   */
  standsSourceLayerId = 'stands';

  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private treatmentsState: TreatmentsState
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
    this.dragStandsSelection = true;

    this.mouseStart = event;
  }

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (this.mapConfigState.isStandSelectionEnabled()) {
      this.treatmentTooltipLngLat = event.lngLat;
    } else {
      this.treatmentTooltipLngLat = null;
    }

    if (!this.dragStandsSelection) return;
    // hide the treatment dialog while dragging
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
    this.mouseEnd = event;
  }

  onMapMouseUp(): void {
    if (!this.dragStandsSelection) return;
    this.dragStandsSelection = false;
    this.mouseStart = null;
    this.mouseEnd = null;
  }

  onMapMouseOut() {
    this.treatmentTooltipLngLat = null;
  }

  onSourceData(event: MapSourceDataEvent) {
    if (event.sourceId === this.standsSourceLayerId && event.isSourceLoaded) {
      this.standsLoaded$.next(true);
    }
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addAuthHeaders(url, resourceType, this.authService.getAuthCookie());
}
