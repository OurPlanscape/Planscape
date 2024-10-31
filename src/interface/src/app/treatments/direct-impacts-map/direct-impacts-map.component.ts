import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ControlComponent, MapComponent } from '@maplibre/ngx-maplibre-gl';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { AuthService } from '@services';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';

@Component({
  selector: 'app-direct-impacts-map',
  standalone: true,
  imports: [
    AsyncPipe,
    MapComponent,
    MapControlsComponent,
    MapProjectAreasComponent,
    MapRectangleComponent,
    MapStandsComponent,
    MapTooltipComponent,
    NgIf,
    ControlComponent,
  ],
  templateUrl: './direct-impacts-map.component.html',
  styleUrl: './direct-impacts-map.component.scss',
})
export class DirectImpactsMapComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService
  ) {}

  @Input() label = '';
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

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
    this.mapCreated.emit(this.mapLibreMap);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) => {
    // add auth cookie to our tiles requests
    if (resourceType === 'Tile' && url.includes('planscape.org')) {
      return {
        url: url, // Keep the URL unchanged
        headers: {
          Authorization: 'Bearer ' + this.authService.getAuthCookie(),
        },
      };
    }
    return { url }; // Return unchanged if not applying headers
  };
}
