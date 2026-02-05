import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import {
  ControlComponent,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';

import {
  LngLat,
  Map as MapLibreMap,
  MapMouseEvent,
  RequestTransformFunction,
  ResourceType,
} from 'maplibre-gl';
import { AuthService } from '@services';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from '@app/maplibre-map/maplibre.helper';
import { MatIconModule } from '@angular/material/icon';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { baseMapStyles } from '@app/maplibre-map/map-base-layers';
import { MapBaseLayersComponent } from '@app/maplibre-map/map-base-layers/map-base-layers.component';
import { TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';
import { firstValueFrom, map, switchMap, take, tap } from 'rxjs';
import { MapDrawingToolboxComponent } from '@app/maplibre-map/map-drawing-toolbox/map-drawing-toolbox.component';
import {
  DefaultSelectConfig,
  DrawService,
} from '@app/maplibre-map/draw.service';
import { MapTooltipComponent } from '@app/treatments/map-tooltip/map-tooltip.component';
import { FeatureId } from 'terra-draw/dist/extend';
import { MapDataLayerComponent } from '@app/maplibre-map/map-data-layer/map-data-layer.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { DataLayersRegistryService } from '@app/explore/data-layers-registry';
import { MapLayerColorLegendComponent } from '@app/maplibre-map/map-layer-color-legend/map-layer-color-legend.component';
import { MapBoundaryLayerComponent } from '@app/maplibre-map/map-boundary-layer/map-boundary-layer.component';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { PlanState } from '@app/plan/plan.state';
import { DataLayer } from '@types';
import { MultiMapsStorageService } from '@services/local-storage.service';
import { FrontendConstants } from '@app/map/map.constants';

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
    MapTooltipComponent,
    MapDataLayerComponent,
    LayerComponent,
    MapLayerColorLegendComponent,
    MapBoundaryLayerComponent,
    PlanningAreaLayerComponent,
  ],
  providers: [DataLayersStateService],
  templateUrl: './explore-map.component.html',
  styleUrl: './explore-map.component.scss',
})
export class ExploreMapComponent implements OnInit, OnDestroy {
  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  planId$ = this.planState.currentPlanId$;

  /**
   * Observable that indicates whether the user is in 'draw', 'upload', or 'view' modes
   */
  mapInteractionMode$ = this.mapConfigState.mapInteractionMode$;

  bounds$ = this.planId$.pipe(
    switchMap((id) => {
      if (id) {
        return this.planState.planningAreaGeometry$.pipe(
          map((geometry) => {
            return getBoundsFromGeometry(geometry);
          })
        );
      }
      return this.mapConfigState.mapExtent$;
    })
  );

  boundOptions$ = this.planState.currentPlanId$.pipe(
    map((id) => (id ? FrontendConstants.MAPLIBRE_BOUND_OPTIONS : undefined))
  );

  layoutMode$ = this.multiMapConfigState.layoutMode$;

  mouseLngLat: LngLat | null = null;
  currentDrawingMode$ = this.drawService.currentDrawingMode$;
  drawModeTooltipContent: string | null = null;
  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;
  /**
   * MapLibre requires an initital basemap, so we default to this,
   * but we set this dynamically using updateBaseMap() below.
   */
  initialBaseMap = baseMapStyles.road;
  @Input() showMapNumber = true;

  @Output() mapCreated = new EventEmitter<{
    map: MapLibreMap;
    mapNumber: number;
  }>();
  @Input() mapNumber = 1;
  @Input() showAttribution = false;

  isSelected$ = this.multiMapConfigState.selectedMapId$.pipe(
    // If mapId is null means we are in other tab and we don't want to display highlighted Maps
    map((mapId) => mapId && this.mapNumber === mapId)
  );

  selectedLayer$ = this.dataLayersStateService.viewedDataLayer$.pipe(
    tap((layer) => {
      // If the selected layer was updated we want to update the storage
      this.saveSelectedLayerOnStorage(layer);
    })
  );

  constructor(
    private mapConfigState: MapConfigState,
    private multiMapConfigState: MultiMapConfigState,
    private multimapStorage: MultiMapsStorageService,
    private authService: AuthService,
    private drawService: DrawService,
    private dataLayersStateService: DataLayersStateService,
    private registry: DataLayersRegistryService,
    private planState: PlanState
  ) {
    this.mapConfigState.mapInteractionMode$
      .pipe(untilDestroyed(this))
      .subscribe((mode) => {
        if (mode === 'draw') {
          this.enablePolygonDrawingMode();
        } else if (mode === 'upload') {
          this.drawService.setMode('select');
        } else {
          this.cancelDrawingMode();
        }
      });

    this.mapConfigState.baseMapUrl$
      .pipe(untilDestroyed(this))
      .subscribe((url) => {
        if (url) {
          this.updateBaseMap(url.toString());
        }
      });
  }

  ngOnInit() {
    this.registry.set(this.mapNumber, this.dataLayersStateService);
    // Loading layer from the storage if exists
    const multimapStorage = this.multimapStorage.getItem();
    const selectedLayer = multimapStorage?.dataLayers?.[this.mapNumber] || null;
    if (selectedLayer) {
      this.dataLayersStateService.selectDataLayer(selectedLayer);
      this.dataLayersStateService.goToSelectedLayer(selectedLayer);
    }
  }

  /*
  Here, we are bypassing the [style] attribute in the mgl adapter, 
  because changes there are known to wipe all previous layers.
   Instead, we call that programmatically here with .setStyle() 
   after preserving the layers created  dynamically by terradraw 
   (All terradraw layers are prefixed 'td-', etc), so we merge that into the style
   object that we se there.
  */
  updateBaseMap(url: string) {
    if (!this.mapLibreMap) {
      return;
    }
    const resourceType: ResourceType = ResourceType.Style;
    const requestUrl = addRequestHeaders(
      url,
      resourceType,
      this.authService.getAuthCookie()
    );

    fetch(requestUrl.url)
      .then((response) => response.json())
      .then((newStyle) => {
        const currentStyle = this.mapLibreMap.getStyle();

        // collect everything that's a layer we want to preserve
        const customLayers = currentStyle.layers.filter((layer) =>
          this.isCustomLayer(layer)
        );
        const customSources = this.getCustomSources(
          customLayers,
          currentStyle.sources
        );
        // merge these into a new style object with new basemap sources
        const fullNewMapStyle = {
          ...newStyle,
          sources: {
            ...newStyle.sources,
            ...customSources,
          },
          layers: [...newStyle.layers, ...customLayers],
        };
        //set the whole map style
        this.mapLibreMap.setStyle(fullNewMapStyle);
      })
      .catch((error) => {
        console.error('Error updating base layers:', error);
      });
  }

  //identify layers to preserve using layer name prefix
  private isCustomLayer(layer: any): boolean {
    const customLayerPrefixes = ['td-', 'drawing-', 'shapefile-', 'bottom-'];
    return customLayerPrefixes.some((prefix) => layer.id.startsWith(prefix));
  }

  //collect sources for identified layers
  private getCustomSources(customLayers: any[], allSources: any): any {
    const customSources: any = {};
    customLayers.forEach((layer) => {
      if (layer.source && allSources[layer.source]) {
        customSources[layer.source] = allSources[layer.source];
      }
    });
    return customSources;
  }

  ngOnDestroy() {
    this.registry.clear(this.mapNumber);
  }

  mapLoaded(map: MapLibreMap) {
    this.mapLibreMap = map;
    this.mapCreated.emit({ map: map, mapNumber: this.mapNumber });
    this.initDrawingModes();
  }

  initDrawingModes() {
    const polygonMode = new TerraDrawPolygonMode({
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
      pointerDistance: 10, // reduce snap distance / auto-finish sensitivity
    });
    const selectMode = new TerraDrawSelectMode(DefaultSelectConfig);
    this.drawService.initializeTerraDraw(this.mapLibreMap, [
      polygonMode,
      selectMode,
    ]);
  }

  onMapMouseMove(event: MapMouseEvent): void {
    this.mouseLngLat = event.lngLat;
  }

  onDrawChange(ids: FeatureId[]) {
    if (this.drawService.getMode() === 'polygon') {
      const pointCount = this.drawService.getPolygonPointCount(ids[0]);
      if (pointCount > 3 && pointCount <= 5) {
        this.drawModeTooltipContent = 'Click to continue drawing';
      } else if (pointCount > 5) {
        this.drawModeTooltipContent = 'Click first marker to finish';
      } else {
        this.drawModeTooltipContent = null;
      }
    } else {
      this.drawModeTooltipContent = null;
    }
  }

  enablePolygonDrawingMode() {
    this.drawService.start();
    this.drawService.setMode('polygon');
    this.drawService.registerChangeCallback((ids: FeatureId[]) =>
      this.onDrawChange(ids)
    );
    this.drawModeTooltipContent = 'Click to place first vertex';
  }

  cancelDrawingMode() {
    if (!this.mapLibreMap) {
      return;
    } else {
      this.drawService.setMode('select');
      this.drawService.stop();
    }
  }

  async selectMapIfInViewMode() {
    const mode = await firstValueFrom(this.mapInteractionMode$.pipe(take(1)));
    const enabled = await firstValueFrom(
      this.multiMapConfigState.allowClickOnMap$.pipe(take(1))
    );
    if (mode === 'view' && enabled) {
      this.multiMapConfigState.setSelectedMap(this.mapNumber);
    }
  }

  goToSelectedLayer(layer: DataLayer) {
    this.multiMapConfigState.setSelectedMap(this.mapNumber);
    this.dataLayersStateService.goToSelectedLayer(layer);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());

  saveSelectedLayerOnStorage(layer: DataLayer | null) {
    const existingStorage = this.multimapStorage.getItem();
    if (existingStorage?.dataLayers) {
      existingStorage.dataLayers[this.mapNumber] = layer;
      this.multimapStorage.setItem(existingStorage);
    } else {
      this.multimapStorage.setItem({
        ...existingStorage,
        dataLayers: {
          [this.mapNumber]: layer,
        },
      });
    }
  }
}
