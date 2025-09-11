import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanState } from '../plan.state';
import { SharedModule } from '../../shared/shared.module';
import { Plan } from '@types';
import { take, map } from 'rxjs/operators';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { PlanningAreaLayerComponent } from '../../maplibre-map/planning-area-layer/planning-area-layer.component';
import {
  Map as MapLibreMap,
  RequestTransformFunction,
  ResourceType,
} from 'maplibre-gl';
import { AuthService } from '@services';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from '../../maplibre-map/maplibre.helper';
import { FrontendConstants } from '../../map/map.constants';
import { BreadcrumbService } from '@services/breadcrumb.service';

@Component({
  selector: 'app-climate-foresight',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SharedModule,
    MapComponent,
    PlanningAreaLayerComponent,
  ],
  templateUrl: './climate-foresight.component.html',
  styleUrls: ['./climate-foresight.component.scss'],
})
export class ClimateForesightComponent implements OnInit {
  planName = '';
  planAcres = '';
  hasAnalyses = false;
  currentPlan: Plan | null = null;
  mapLibreMap?: MapLibreMap;

  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      if (!geometry) {
        return null;
      }
      const bounds = getBoundsFromGeometry(geometry);
      if (bounds?.every((coord) => isFinite(coord))) {
        return bounds;
      }
      return null;
    })
  );

  constructor(
    private breadcrumbService: BreadcrumbService,
    private router: Router,
    private route: ActivatedRoute,
    private planState: PlanState,
    private authService: AuthService,
    private mapConfigState: MapConfigState
  ) {}

  ngOnInit(): void {
    this.planState.currentPlan$.pipe(take(1)).subscribe((plan) => {
      if (plan) {
        this.currentPlan = plan;
        this.planName = plan.name;
        this.planAcres = plan.area_acres
          ? `Acres: ${plan.area_acres.toLocaleString()}`
          : '';

        this.breadcrumbService.breadcrumb$
          .pipe(take(1))
          .subscribe((breadcrumb) => {
            if (breadcrumb?.label !== 'Climate Foresight') {
              this.breadcrumbService.updateBreadCrumb({
                label: 'Climate Foresight',
                backUrl: `/plan/${this.currentPlan?.id}`,
              });
            }
          });
      }
    });
  }

  mapLoaded(map: MapLibreMap): void {
    this.mapLibreMap = map;
  }

  /**
   * Add authorization headers to map tile requests
   */
  transformRequest: RequestTransformFunction = (
    url: string,
    resourceType?: ResourceType
  ) => {
    return addRequestHeaders(
      url,
      resourceType,
      this.authService.getAuthCookie()
    );
  };

  navigateBack(): void {
    const planId = this.route.snapshot.data['planId'];
    if (planId) {
      this.router.navigate(['/plan', planId]);
    } else {
      this.router.navigate(['/']);
    }
  }

  startAnalysis(): void {
    this.hasAnalyses = true;
  }
}
