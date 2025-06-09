import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { ControlComponent, MapComponent } from '@maplibre/ngx-maplibre-gl';
import { FrontendConstants } from '../../map/map.constants';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { AuthService } from '@services';
import { addRequestHeaders } from '../maplibre.helper';
import { MapConfigState } from '../map-config.state';
import { MapBaseLayersComponent } from '../map-base-layers/map-base-layers.component';
import { MultiMapConfigState } from '../multi-map-config.state';
import { map } from 'rxjs';

@Component({
  selector: 'app-explore-map',
  standalone: true,
  imports: [
    NgClass,
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
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

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
    // If mapId is null means we are in other tab and we dont want to display highlighted Maps
    map((mapId) => mapId && this.mapNumber === mapId)
  );

  constructor(
    private mapConfigState: MapConfigState,
    private multiMapConfigState: MultiMapConfigState,
    private authService: AuthService
  ) {}

  mapLoaded(map: MapLibreMap) {
    this.mapLibreMap = map;
    this.mapCreated.emit({ map: map, mapNumber: this.mapNumber });
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
