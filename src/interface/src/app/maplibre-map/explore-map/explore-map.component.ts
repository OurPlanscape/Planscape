import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ControlComponent, MapComponent } from '@maplibre/ngx-maplibre-gl';
import { FrontendConstants } from '../../map/map.constants';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { MapConfigState } from '../map-config.state';
import { AuthService } from '@services';
import { addRequestHeaders } from '../maplibre.helper';

@Component({
  selector: 'app-explore-map',
  standalone: true,
  imports: [AsyncPipe, MapComponent, ControlComponent, NgIf],
  templateUrl: './explore-map.component.html',
  styleUrl: './explore-map.component.scss',
})
export class ExploreMapComponent {
  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  bounds = FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS as [
    number,
    number,
    number,
    number,
  ];
  boundOptions = FrontendConstants.MAPLIBRE_BOUND_OPTIONS;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;

  @Input() showMapNumber = true;

  @Output() mapCreated = new EventEmitter<{
    map: MapLibreMap;
    mapNumber: number;
  }>();
  @Input() mapNumber = 1;
  @Input() showAttribution = false;

  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService
  ) {}

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
