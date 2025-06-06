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
import { TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MultiMapConfigState } from '../multi-map-config.state';
import { map } from 'rxjs';
import { MapDrawingToolboxComponent } from '../map-drawing-toolbox/map-drawing-toolbox.component';
import { DrawService } from '../draw.service';

export type DrawState = 'none' | 'polygon' | 'select';

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
    MapDrawingToolboxComponent,
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

  isSelected$ = this.multiMapConfigState.selectedMapId$.pipe(
    map((mapId) => this.mapNumber === mapId)
  );

  constructor(
    private mapConfigState: MapConfigState,
    private multiMapConfigState: MultiMapConfigState,
    private authService: AuthService,
    private drawService: DrawService
    // private dialog: MatDialog
  ) {
    mapConfigState.drawingModeEnabled$
      .pipe(untilDestroyed(this))
      .subscribe((drawingModeStatus) => {
        if (drawingModeStatus === true) {
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

    const polygonMode = new TerraDrawPolygonMode({
      //TODO: pull styles from elsewhere...?
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
    this.drawService.initializeTerraDraw(mapLibreAdapter, [
      polygonMode,
      selectMode,
    ]);
  }

  enablePolygonDrawingMode() {
    this.drawService.start();
    this.drawService.setMode('polygon');
    //todo: set actual finish function in this component.
    this.drawService.registerFinish();
  }

  cancelDrawingMode() {
    this.drawService.setMode('select');
    this.drawService.stop();
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
