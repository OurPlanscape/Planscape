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
  Popup,
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
import { map, switchMap } from 'rxjs';
import { MapDrawingToolboxComponent } from '../map-drawing-toolbox/map-drawing-toolbox.component';
import { DefaultSelectConfig, DrawService } from '../draw.service';
import { MapTooltipComponent } from '../../treatments/map-tooltip/map-tooltip.component';
import { FeatureId } from 'terra-draw/dist/extend';
import { MapDataLayerComponent } from '../map-data-layer/map-data-layer.component';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { DataLayersRegistryService } from '../../explore/data-layers-registry';
import { MapLayerColorLegendComponent } from '../map-layer-color-legend/map-layer-color-legend.component';
import { PlanningAreaLayerComponent } from '../planning-area-layer/planning-area-layer.component';
import { PlanState } from '../../plan/plan.state';
import { DataLayer } from '@types';

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

  bounds$ = this.planState.currentPlanId$.pipe(
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
    // If mapId is null means we are in other tab and we dont want to display highlighted Maps
    map((mapId) => mapId && this.mapNumber === mapId)
  );
  selectedFeatureId$ = this.drawService.selectedFeatureId$;

  selectedLayer$ = this.dataLayersStateService.selectedDataLayer$;

  constructor(
    private mapConfigState: MapConfigState,
    private multiMapConfigState: MultiMapConfigState,
    private authService: AuthService,
    private drawService: DrawService,
    private dataLayersStateService: DataLayersStateService,
    private registry: DataLayersRegistryService,
    private planState: PlanState
  ) {
    this.mapConfigState.drawingModeEnabled$
      .pipe(untilDestroyed(this))
      .subscribe((drawingModeStatus) => {
        if (drawingModeStatus === true) {
          this.enablePolygonDrawingMode();
        } else {
          this.cancelDrawingMode();
        }
      });
  }

  ngOnInit() {
    this.registry.set(this.mapNumber, this.dataLayersStateService);
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

  drawAcreageTooltip(featureId: FeatureId) {
    const coords = this.drawService.getPolygonBottomCenterCoords(featureId);
    if (coords) {
      new Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        anchor: 'top',
        offset: [0, 10],
        className: 'acreage-popup',
      }) // TODO: plug in acreage when its merged
        .setLngLat([coords[0], coords[1]])
        .setHTML('here is some acreage')
        .addTo(this.mapLibreMap);
    }
  }

  afterFinish(featureId: string) {
    // clears the hover tooltip
    this.drawModeTooltipContent = null;

    // TODO: add this when we have new acreage calculated
    // this.drawAcreageTooltip(featureId);
  }

  onDrawChange(changes: any) {
    if (this.drawService.getMode() === 'polygon') {
      const pointCount = this.drawService.getPolygonPointCount(changes[0]);
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
    this.drawService.registerFinish((featureId: string) =>
      this.afterFinish(featureId)
    );
    this.drawService.registerChangeCallback((context: any) =>
      this.onDrawChange(context)
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
}
