import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  ControlComponent,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import { MapRectangleComponent } from '@treatments/map-rectangle/map-rectangle.component';
import { MapStandsComponent } from '@treatments/map-stands/map-stands.component';
import { MapTooltipComponent } from '@treatments/map-tooltip/map-tooltip.component';
import { MapConfigState } from '@maplibre/map-config.state';
import { AuthService } from '@services';
import {
  Map as MapLibreMap,
  MapSourceDataEvent,
  RequestTransformFunction,
} from 'maplibre-gl';
import { addRequestHeaders } from '@maplibre/maplibre.helper';
import { MapStandsTxResultComponent } from '@treatments/map-stands-tx-result/map-stands-tx-result.component';
import {
  YEAR_INTERVAL_LABELS,
  YEAR_INTERVAL_PROPERTY,
  YearInterval,
} from '../metrics';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { MapActionButtonComponent } from '@treatments/map-action-button/map-action-button.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MapProjectAreasComponent } from '@maplibre/map-project-areas/map-project-areas.component';
import { FeaturesModule } from '@features/features.module';
import { MapNavbarComponent } from '@maplibre/map-nav-bar/map-nav-bar.component';
import { OpacitySliderComponent } from '@styleguide';
import { RxSelectionToggleComponent } from '@maplibre/rx-selection-toggle/rx-selection-toggle.component';
import { MapZoomControlComponent } from '@maplibre/map-zoom-control/map-zoom-control.component';
import { FrontendConstants } from '@map/map.constants';

@UntilDestroy()
@Component({
  selector: 'app-direct-impacts-map',
  standalone: true,
  imports: [
    AsyncPipe,
    MapComponent,
    MapProjectAreasComponent,
    MapRectangleComponent,
    MapStandsComponent,
    MapTooltipComponent,
    NgIf,
    ControlComponent,
    MapStandsTxResultComponent,
    MapActionButtonComponent,
    FeaturesModule,
    MapNavbarComponent,
    OpacitySliderComponent,
    RxSelectionToggleComponent,
    MapZoomControlComponent,
    LayerComponent,
  ],
  templateUrl: './direct-impacts-map.component.html',
  styleUrl: './direct-impacts-map.component.scss',
})
export class DirectImpactsMapComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private directImpactsStateService: DirectImpactsStateService,
    private authService: AuthService
  ) {}

  readonly labels = YEAR_INTERVAL_LABELS;

  readonly variables = YEAR_INTERVAL_PROPERTY;
  @Input() year: YearInterval = 'zero';
  @Output()
  mapCreated = new EventEmitter<MapLibreMap>();

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;
  /**
   * Observable that provides the map extent (bounds) for the treatment plan or project area
   */
  mapExtent$ = this.mapConfigState.mapExtent$;

  boundOptions = FrontendConstants.MAPLIBRE_BOUND_OPTIONS;

  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  showLegend$ = this.mapConfigState.showTreatmentLegend$;

  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;

  opacity$ = this.mapConfigState.treatedStandsOpacity$;

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
    this.mapCreated.emit(this.mapLibreMap);
    this.saveZoom();

    this.mapConfigState.standSelectionEnabled$
      .pipe(untilDestroyed(this))
      .subscribe((enabled) => {
        this.mapLibreMap.getCanvas().style.cursor = enabled ? 'pointer' : '';
      });
  }

  saveZoom() {
    this.mapConfigState.zoomLevel$.next(this.mapLibreMap.getZoom());
  }

  sourceData(event: MapSourceDataEvent) {
    if (
      event.sourceId === 'stands_by_tx_result' &&
      event.isSourceLoaded &&
      !event.sourceDataType
    ) {
      this.directImpactsStateService.setStandsTxSourceLoaded(true);
    }
  }

  openTreatmentLegend() {
    this.mapConfigState.setTreatmentLegendVisible(true);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setTreatedStandsOpacity(opacity);
  }
}
