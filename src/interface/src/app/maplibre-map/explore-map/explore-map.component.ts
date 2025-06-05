import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { ControlComponent, MapComponent } from '@maplibre/ngx-maplibre-gl';
import { FrontendConstants } from '../../map/map.constants';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { AuthService } from '@services';
import { addRequestHeaders } from '../maplibre.helper';
import { MatIconModule } from '@angular/material/icon';
import { MapConfigState } from '../map-config.state';
import { MapBaseLayersComponent } from '../map-base-layers/map-base-layers.component';
import {
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawLineStringMode,
  TerraDraw,
  GeoJSONStoreFeatures,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import * as turf from '@turf/turf';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MultiMapConfigState } from '../multi-map-config.state';
import { map } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-explore-map',
  standalone: true,
  imports: [
    NgClass,
    AsyncPipe,
    MapComponent,
    MatIconModule,
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
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;
  drawingModeEnabled$ = this.mapConfigState.drawingModeEnabled$;
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

  isSelected$ = this.multiMapConfigState.selectedMapId$.pipe(
    map((mapId) => this.mapNumber === mapId)
  );

  constructor(
    private mapConfigState: MapConfigState,
    private multiMapConfigState: MultiMapConfigState,
    private authService: AuthService
  ) {
    mapConfigState.drawingModeEnabled$
      .pipe(untilDestroyed(this))
      .subscribe((drawingModeStatus) => {
        if (drawingModeStatus) {
          this.enablePolygonDrawingMode();
        } else {
          this.cancelDrawingMode();
        }
      });
  }

  mapLoaded(map: MapLibreMap) {
    this.mapLibreMap = map;
    this.mapCreated.emit({ map: map, mapNumber: this.mapNumber });
    this.initDrawingModes();
  }

  initDrawingModes() {
    const mapLibreAdapter = new TerraDrawMapLibreGLAdapter({
      map: this.mapLibreMap,
    });

    // TODO: may not use this...
    const lineStringMode = new TerraDrawLineStringMode();
    const polygonMode = new TerraDrawPolygonMode({
      //TODO: pull styles from elsewhere...
      styles: {
        fillColor: '#A5C8D7',
        fillOpacity: 0.5,
        outlineColor: '#000000',
        outlineWidth: 2,
        closingPointColor: '#ffffff',
        closingPointWidth: 6,
        closingPointOutlineColor: '#0000ee',
        closingPointOutlineWidth: 2,
      },
    });
    // with this config, we just use 'select mode' as a mode that disallows new polygons,
    // but we disable the polygon edit features -- TODO: though we may actually want these?
    const selectMode = new TerraDrawSelectMode({
      flags: {
        linestring: {
          feature: {
            draggable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
            },
          },
        },
        polygon: {
          feature: {
            draggable: true,
            coordinates: {
              midpoints: {
                draggable: true,
              },
              draggable: true,
              snappable: true,
              deletable: true,
            },
          },
        },
      },
    });
    this.terraDraw = new TerraDraw({
      adapter: mapLibreAdapter,
      modes: [lineStringMode, polygonMode, selectMode],
    });
  }

  enablePolygonDrawingMode() {
    if (this.terraDraw && !this.terraDraw.enabled) {
      this.terraDraw?.start();
    }
    this.terraDraw?.setMode('polygon');

    this.terraDraw?.on('finish', (id: any, context: any) => {
      const feature = this.terraDraw?.getSnapshotFeature(id);
      if (feature) {
        this.calculateAcreage(feature);
      }
    });
  }

  //TODO: complete this PoC to match our backend acreage measurement
  calculateAcreage(polygon: GeoJSONStoreFeatures) {
    if (!turf.booleanValid(polygon)) {
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

  //handle draw controls
  handlePolygonButton() {
    this.terraDraw?.setMode('polygon');
  }

  handleSelectButton() {
    this.terraDraw?.setMode('select');
  }

  handleTrashButton() {
    this.terraDraw?.clear();
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
