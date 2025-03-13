import { Component, Input, Renderer2, OnInit } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import {
  ControlComponent,
  DraggableDirective,
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  PopupComponent,
  VectorSourceComponent,
  RasterSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import maplibregl, {
  LngLat,
  Map as MapLibreMap,
  MapMouseEvent,
  MapSourceDataEvent,
  RequestTransformFunction,
} from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapControlsComponent } from '../../maplibre-map/map-controls/map-controls.component';
import { MapActionButtonComponent } from '../map-action-button/map-action-button.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatIconModule } from '@angular/material/icon';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { AuthService } from '@services';
import { TreatmentsState } from '../treatments.state';
import { addRequestHeaders } from '../../maplibre-map/maplibre.helper';
import { PlanningAreaLayerComponent } from '../../maplibre-map/planning-area-layer/planning-area-layer.component';
import { combineLatest, map, startWith, Subject, withLatestFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SelectedStandsState } from './selected-stands.state';
import { canEditTreatmentPlan } from 'src/app/plan/permissions';
import { MatLegacySlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { OpacitySliderComponent } from '@styleguide';
import { FeaturesModule } from 'src/app/features/features.module';
import { FeatureService } from 'src/app/features/feature.service';
import { MapBaseDropdownComponent } from 'src/app/maplibre-map/map-base-dropdown/map-base-dropdown.component';
import { MapNavbarComponent } from '../../maplibre-map/map-nav-bar/map-nav-bar.component';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { cogProtocol } from '@geomatico/maplibre-cog-protocol';
import { makeColorFunction } from '../../data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import { HttpClient } from '@angular/common/http';

@UntilDestroy()
@Component({
  selector: 'app-treatment-map',
  standalone: true,
  imports: [
    JsonPipe,
    NgForOf,
    MapComponent,
    VectorSourceComponent,
    RasterSourceComponent,
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
    ControlComponent,
    MatLegacySlideToggleModule,
    OpacitySliderComponent,
    FeaturesModule,
    MapBaseDropdownComponent,
    MapNavbarComponent,
  ],
  templateUrl: './treatment-map.component.html',
  styleUrl: './treatment-map.component.scss',
})
export class TreatmentMapComponent implements OnInit {
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
   * Observable that provides if stand selection is enabled
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
  opacity$ = this.mapConfigState.treatedStandsOpacity$;
  stylesUrl = '/assets/cogstyles/example.json';
  styles2Url = '/assets/cogstyles/example2.json';
  cogUrl?: string;

  // TODO: maybe set this at the component-level?
  registerProtocols() {
    if (!maplibregl.getProtocol('cog')) {
      maplibregl.addProtocol('cog', cogProtocol);
    } else {
      console.log('it was not set');
    }
  }

  ngOnInit(): void {
    this.registerProtocols();
  }

  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private treatmentsState: TreatmentsState,
    private selectedStandsState: SelectedStandsState,
    private featureService: FeatureService,
    private renderer: Renderer2,
    private dataLayersStateService: DataLayersStateService,
    private client: HttpClient
  ) {
    // update cursor on map
    this.mapConfigState.cursor$
      .pipe(untilDestroyed(this))
      .subscribe((cursor) => {
        if (this.mapLibreMap) {
          this.mapLibreMap.getCanvas().style.cursor = cursor;
        }
      });

    combineLatest([
      this.treatmentsState.planningArea$,
      this.treatmentsState.projectAreaId$,
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([plan]) => {
        this.userCanEditStands = plan ? canEditTreatmentPlan(plan) : false;
        if (!this.userCanEditStands) {
          this.mapConfigState.setStandSelectionEnabled(false);
        }
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
      // move the layer up
      this.mapLibreMap.moveLayer('map-project-areas-line');
      this.mapLibreMap.moveLayer('map-project-areas-highlight');
      if (this.mapLibreMap.getLayer('map-project-areas-labels')) {
        this.mapLibreMap.moveLayer('map-project-areas-labels');
      }
    });

    // If FF statewide_datalayers is On we want to add a clase to the body to apply some global styles
    if (this.featureService.isFeatureEnabled('statewide_datalayers')) {
      this.renderer.addClass(document.body, 'statewide-datalayers');
    } else {
      this.renderer.removeClass(document.body, 'statewide-datalayers');
    }

    this.dataLayersStateService.selectedDataLayer$
      .pipe(untilDestroyed(this))
      .subscribe((layer) => {
        this.cogUrl = `cog://${layer?.public_url}`;
        if (layer?.public_url) {
          //TODO: fetch associated style for this image

          this.client.get(this.styles2Url).subscribe((styleJson) => {
            const colorFn = makeColorFunction(styleJson as any);
            setColorFunction(layer.public_url ?? '', colorFn);
          });
        }
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

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setTreatedStandsOpacity(opacity);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
