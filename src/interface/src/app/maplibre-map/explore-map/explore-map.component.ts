import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ControlComponent, MapComponent } from '@maplibre/ngx-maplibre-gl';
import { FrontendConstants } from '../../map/map.constants';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { AuthService } from '@services';
import { addRequestHeaders } from '../maplibre.helper';
import { MapConfigState } from '../map-config.state';
import { MapBaseLayersComponent } from '../map-base-layers/map-base-layers.component';
import {
  TerraDrawPolygonMode,
  // TerraDrawSelectMode, // TODO: some features might actually be useful to us...
  TerraDraw,
  GeoJSONStoreFeatures,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import * as turf from '@turf/turf';
@Component({
  selector: 'app-explore-map',
  standalone: true,
  imports: [
    AsyncPipe,
    MapComponent,
    ControlComponent,
    NgIf,
    MapBaseLayersComponent,
  ],
  templateUrl: './explore-map.component.html',
  styleUrl: './explore-map.component.scss',
})
export class ExploreMapComponent {
  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  bounds$ = this.mapConfigState.mapExtent$;
  boundOptions = FrontendConstants.MAPLIBRE_BOUND_OPTIONS;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;

  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  @Input() showMapNumber = true;

  @Output() mapCreated = new EventEmitter<{
    map: MapLibreMap;
    mapNumber: number;
  }>();
  @Input() mapNumber = 1;
  @Input() showAttribution = false;

  terraDraw: TerraDraw | null = null;

  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService
  ) {}

  mapLoaded(map: MapLibreMap) {
    this.mapLibreMap = map;
    this.mapCreated.emit({ map: map, mapNumber: this.mapNumber });
    this.initDrawingModes();
    this.enablePolygonDrawingMode();
  }
  initDrawingModes() {
    const mapLibreAdapter = new TerraDrawMapLibreGLAdapter({
      map: this.mapLibreMap,
    });
    const polygonMode = new TerraDrawPolygonMode({
      //TODO: pull styles from elsewhere...
      styles: {
        fillColor: '#aaeeaa',
        fillOpacity: 0.7,
        outlineColor: '#00ff00',
        outlineWidth: 2,
        closingPointColor: '#00ff00',
        closingPointWidth: 5,
        closingPointOutlineColor: '#00ffee',
        closingPointOutlineWidth: 2,
      },
    });
    this.terraDraw = new TerraDraw({
      adapter: mapLibreAdapter,
      modes: [polygonMode],
    });
  }

  enablePolygonDrawingMode() {
    this.terraDraw?.start();
    this.terraDraw?.setMode('polygon');
    this.terraDraw?.on('finish', (id: any, context: any) => {
      // TODO: keep a reference to this polygon, in order to save it as a feature
      // this.cancelDrawingMode();
      const feature = this.terraDraw?.getSnapshotFeature(id);
      if (feature) {
        this.calculateAcreage(feature);
      }
    });
  }

  //TODO: complete this PoC to match our backend acreage measurement
  calculateAcreage(polygon: GeoJSONStoreFeatures) {
    if (!turf.booleanValid(polygon)) {
      console.log('not a valid polygon');
      return;
    }
    const CONVERSION_SQM_ACRES = 4046.8564213562374;
    const areaInSquareMeters = turf.area(polygon);
    const areaInAcres = areaInSquareMeters / CONVERSION_SQM_ACRES;
    console.log(`Area: ${areaInAcres} acres`);
  }

  cancelDrawingMode() {
    this.terraDraw?.stop();
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
