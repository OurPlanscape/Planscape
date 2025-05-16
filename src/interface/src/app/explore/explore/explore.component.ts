import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FrontendConstants } from '../../map/map.constants';
import { MapNavbarComponent } from '../../maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { RequestTransformFunction } from 'maplibre-gl';
import { addRequestHeaders } from '../../maplibre-map/maplibre.helper';
import { AuthService } from '@services';
import { SharedModule } from '@shared';
import { BreadcrumbService } from '@services/breadcrumb.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [AsyncPipe, MapNavbarComponent, MapComponent, SharedModule],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss',
  providers: [MapConfigState],
})
export class ExploreComponent {
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

  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private breadcrumbService: BreadcrumbService
  ) {
    this.breadcrumbService.updateBreadCrumb({
      label: ' New Plan',
      backUrl: '/',
    });
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}
