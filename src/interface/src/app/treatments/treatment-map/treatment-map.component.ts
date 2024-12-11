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
import { MapActionButtonComponent } from '../map-action-button/map-action-button.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapConfigState } from './map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatIconModule } from '@angular/material/icon';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { AuthService } from '@services';
import { TreatmentsState } from '../treatments.state';
import { addAuthHeaders } from '../maplibre.helper';
import { PlanningAreaLayerComponent } from '../planning-area-layer/planning-area-layer.component';
import { combineLatest, map, startWith, Subject, withLatestFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SelectedStandsState } from './selected-stands.state';
import { Geometry } from 'geojson';
import { canEditTreatmentPlan } from 'src/app/plan/permissions';

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
    MapActionButtonComponent,
    MapStandsComponent,
    MapRectangleComponent,
    MapControlsComponent,
    MapProjectAreasComponent,
    NgIf,
    AsyncPipe,
    MatIconModule,
    PopupComponent,
    MapTooltipComponent,
    PlanningAreaLayerComponent,
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
   * Observable (boolean) for whether the treatment legend should be visible
   *  If not, and if we are showing treatments, we show the action button, instead.
   */
  showLegend$ = this.mapConfigState.showTreatmentLegend$;

  /**
   * The name of the source layer used to load stands, and later check if loaded
   */
  standsSourceLayerId = 'stands';

  private sourceLoaded$ = new Subject<MapSourceDataEvent>();

  private standsSourceLoaded$ = this.sourceLoaded$.pipe(
    filter(
      (source) =>
        source.sourceId === this.standsSourceLayerId && !source.sourceDataType
    )
  );

  /**
   * Observable to determine if we show the map project area layer.
   * It uses the `standsSourceLoaded$` as the trigger to re-check the value provided on
   * `mapConfigState`.
   * We could be using mapConfigState.showProjectAreasLayer$ directly, but we want to animate
   * properly when we show and hide this layer, when the user moves between treatment overview and
   * project area.
   */
  showMapProjectAreas$ = combineLatest([
    this.standsSourceLoaded$.pipe(startWith(null)),
    this.mapConfigState.showProjectAreasLayer$,
  ]).pipe(
    map(([bounds, showAreas]) => {
      return showAreas;
    })
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
   * permissions for current user
   */
  userCanEditStands: boolean = false;

  /**
   *
   * The Planning Area geometry
   */
  planningAreaGeometry$ = this.treatmentsState.planningArea$.pipe(
    map((area) => area.geometry as Geometry)
  );

  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private treatmentsState: TreatmentsState,
    private selectedStandsState: SelectedStandsState
  ) {
    // update cursor on map
    this.mapConfigState.cursor$
      .pipe(untilDestroyed(this))
      .subscribe((cursor) => {
        if (this.mapLibreMap) {
          this.mapLibreMap.getCanvas().style.cursor = cursor;
        }
      });

    this.treatmentsState.planningArea$
      .pipe(untilDestroyed(this))
      .subscribe((plan) => {
        this.userCanEditStands = plan ? canEditTreatmentPlan(plan) : false;
      });

    this.mapConfigState.baseLayer$
      .pipe(
        untilDestroyed(this),
        withLatestFrom(this.showTreatmentStands$),
        filter(([_, showTreatmentStands]) => showTreatmentStands) // Only pass through if showTreatmentStands is true
      )
      .subscribe(() => {
        this.selectedStandsState.backUpAndClearSelectedStands();
      });

    this.standsSourceLoaded$.pipe(untilDestroyed(this)).subscribe((s) => {
      this.selectedStandsState.restoreSelectedStands();
    });
  }

  onMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button === 2) {
      return;
    }
    if (
      !this.userCanEditStands ||
      !this.mapConfigState.isStandSelectionEnabled()
    ) {
      return;
    }
    this.dragStandsSelection = true;

    this.mouseStart = event;
  }

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
    this.mapConfigState.zoomLevel$.next(this.mapLibreMap.getZoom());
    this.listenForZoom();
  }

  listenForZoom() {
    this.mapLibreMap.on('zoom', () => {
      this.mapConfigState.zoomLevel$.next(this.mapLibreMap.getZoom());
    });
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (
      this.userCanEditStands &&
      this.mapConfigState.isStandSelectionEnabled()
    ) {
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
    if (event.isSourceLoaded) {
      this.sourceLoaded$.next(event);
    }
  }

  openTreatmentLegend() {
    this.mapConfigState.setTreatmentLegendVisible(true);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addAuthHeaders(url, resourceType, this.authService.getAuthCookie());
}
