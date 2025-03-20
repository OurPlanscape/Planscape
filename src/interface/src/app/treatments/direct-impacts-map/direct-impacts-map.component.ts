import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlComponent, MapComponent } from '@maplibre/ngx-maplibre-gl';
import { MapControlsComponent } from '../../maplibre-map/map-controls/map-controls.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { AuthService } from '@services';
import {
  Map as MapLibreMap,
  MapSourceDataEvent,
  RequestTransformFunction,
} from 'maplibre-gl';
import { addRequestHeaders } from '../../maplibre-map/maplibre.helper';
import { MapStandsTxResultComponent } from '../map-stands-tx-result/map-stands-tx-result.component';
import {
  YEAR_INTERVAL_LABELS,
  YEAR_INTERVAL_PROPERTY,
  YearInterval,
} from '../metrics';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { MapActionButtonComponent } from '../map-action-button/map-action-button.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-direct-impacts-map',
  standalone: true,
  imports: [
    CommonModule,

    MapComponent,
    MapControlsComponent,
    MapProjectAreasComponent,
    MapRectangleComponent,
    MapStandsComponent,
    MapTooltipComponent,
    ControlComponent,
    MapStandsTxResultComponent,
    MapActionButtonComponent,
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
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;
  /**
   * Observable that provides the map extent (bounds) for the treatment plan or project area
   */
  mapExtent$ = this.mapConfigState.mapExtent$;

  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  showLegend$ = this.mapConfigState.showTreatmentLegend$;

  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;

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
      this.moveLayers();
    }
  }

  // Move layers so the hover and selected stand layer sit at the top
  private moveLayers() {
    this.mapLibreMap.moveLayer('map-project-areas-line');
    this.mapLibreMap.moveLayer('standHover');
    this.mapLibreMap.moveLayer('standSelected');

    if (this.mapLibreMap.getLayer('map-project-areas-labels')) {
      this.mapLibreMap.moveLayer('map-project-areas-labels');
    }
  }

  openTreatmentLegend() {
    this.mapConfigState.setTreatmentLegendVisible(true);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
