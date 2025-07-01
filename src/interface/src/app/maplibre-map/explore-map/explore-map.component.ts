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
import { FrontendConstants } from '../../map/map.constants';
import {
  LngLat,
  Map as MapLibreMap,
  MapMouseEvent,
  RequestTransformFunction,
} from 'maplibre-gl';
import { AuthService } from '@services';
import { addRequestHeaders, getBoundsFromGeometry } from '../maplibre.helper';
import { MatIconModule } from '@angular/material/icon';
import { MapConfigState } from '../map-config.state';
import { MapBaseLayersComponent } from '../map-base-layers/map-base-layers.component';
import { TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MultiMapConfigState } from '../multi-map-config.state';
import { map, switchMap, tap } from 'rxjs';
import { MapDrawingToolboxComponent } from '../map-drawing-toolbox/map-drawing-toolbox.component';
import { DefaultSelectConfig, DrawService } from '../draw.service';
import { MapTooltipComponent } from '../../treatments/map-tooltip/map-tooltip.component';
import { FeatureId } from 'terra-draw/dist/extend';
import { MapDataLayerComponent } from '../map-data-layer/map-data-layer.component';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { DataLayersRegistryService } from '../../explore/data-layers-registry';
import { MapLayerColorLegendComponent } from '../map-layer-color-legend/map-layer-color-legend.component';
import { MapBoundaryLayerComponent } from '../map-boundary-layer/map-boundary-layer.component';
import { PlanningAreaLayerComponent } from '../planning-area-layer/planning-area-layer.component';
import { PlanState } from '../../plan/plan.state';
import { DataLayer } from '@types';
import { MultiMapsStorageService } from '@services/local-storage.service';

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
    // If mapId is null means we are in other tab and we don't want to display highlighted Maps
    map((mapId) => mapId && this.mapNumber === mapId)
  );

  selectedLayer$ = this.dataLayersStateService.selectedDataLayer$.pipe(
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
    this.mapConfigState.drawingModeEnabled$
      .pipe(untilDestroyed(this))
      .subscribe((drawingModeStatus) => {
        if (drawingModeStatus) {
          this.enablePolygonDrawingMode();
        } else {
          this.cancelDrawingMode();
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
