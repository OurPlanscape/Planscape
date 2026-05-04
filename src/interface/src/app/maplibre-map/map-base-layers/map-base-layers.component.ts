import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Optional,
} from '@angular/core';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
} from 'maplibre-gl';
import { MapBaseLayerTooltipComponent } from '@maplibre-map/map-base-layer-tooltip/map-base-layer-tooltip.component';
import { BaseLayer, BaseLayerTooltipData } from '@types';
import { MapArcgisVectorLayerComponent } from '@maplibre-map/map-arcgis-vector-layer/map-arcgis-vector-layer.component';
import { defaultBaseLayerFill, defaultBaseLayerLine } from '../maplibre.helper';
import {
  BASE_LAYER_STYLE,
  BaseLayerStyleOverride,
} from './map-base-layers-style.token';
import { BehaviorSubject, combineLatest, map, Observable, take } from 'rxjs';

@Component({
  selector: 'app-map-base-layers',
  standalone: true,
  imports: [
    NgForOf,
    AsyncPipe,
    VectorSourceComponent,
    MapBaseLayerTooltipComponent,
    LayerComponent,
    NgIf,
    MapArcgisVectorLayerComponent,
  ],
  templateUrl: './map-base-layers.component.html',
  styleUrl: './map-base-layers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapBaseLayersComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() before = '';

  /**
   * Resolves the MapLibre `before` layer ID used when adding base layers to the map.
   *
   * Prefers `insertBeforeLayer` from the injected style override (e.g. 'scenario-stands-fill'),
   * falling back to the `before` @Input, then to '' (add on top).
   *
   * The existence check is intentional: on initial map load the target layer may not
   * exist yet (template order handles z-index in that case), but when the user
   * dynamically enables a layer on a later step, the target layer is already present
   * and the insert-below behaviour kicks in correctly.
   */
  get layerInsertPosition(): string {
    const preferred = this.styleOverride?.insertBeforeLayer ?? this.before;
    return preferred && this.mapLibreMap?.getLayer(preferred) ? preferred : '';
  }

  // only one hovered stand
  hoveredFeature: MapGeoJSONFeature | null = null;
  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;
  enableBaseLayerHover$ = this.baseLayersStateService.enableBaseLayerHover$;

  private _tooltipInfo$ = new BehaviorSubject<BaseLayerTooltipData | null>(
    null
  );

  currentTooltipInfo$: Observable<BaseLayerTooltipData | null> = combineLatest([
    this._tooltipInfo$,
    this.selectedLayers$,
  ]).pipe(
    map(([info, layers]: [BaseLayerTooltipData | null, BaseLayer[] | null]) => {
      if (
        !layers ||
        layers?.some((layer) => layer.path.includes('Ownership'))
      ) {
        return null;
      } else {
        return info;
      }
    })
  );

  constructor(
    private baseLayersStateService: BaseLayersStateService,
    private changeDetectorRef: ChangeDetectorRef,
    private zone: NgZone,
    @Optional()
    @Inject(BASE_LAYER_STYLE)
    private styleOverride: BaseLayerStyleOverride | null
  ) {}

  ngOnInit(): void {
    this.setupMapListeners();
  }

  private setupMapListeners() {
    this.mapLibreMap.on('data', this.onDataListener);
    this.mapLibreMap.on('error', this.onErrorListener);
  }

  private onDataListener = (event: any) => {
    if (event.sourceId?.startsWith('source_') && event.isSourceLoaded) {
      // Using ngZone since otherwise the loading spinner will be displayed forever.
      this.zone.run(() => {
        this.baseLayersStateService.removeLoadingSourceId(event.sourceId);
      });
    }
  };

  private onErrorListener = (event: any) => {
    if (event.sourceId?.startsWith('source_') && !event.isSourceLoaded) {
      this.zone.run(() => {
        this.baseLayersStateService.removeLoadingSourceId(event.sourceId);
      });
    }
  };

  ngOnDestroy(): void {
    this.mapLibreMap?.off('data', this.onDataListener);
    this.mapLibreMap?.off('error', this.onErrorListener);
  }

  lineLayerPaint(layer: BaseLayer) {
    const override = this.styleOverrideFor(layer);
    return defaultBaseLayerLine(
      override?.lineColor ?? layer.styles[0].data['fill-outline-color']
    );
  }

  fillLayerPaint(layer: BaseLayer) {
    const override = this.styleOverrideFor(layer);
    return defaultBaseLayerFill(
      override?.fillColor ?? layer.styles[0].data['fill-color'],
      override?.fillOpacity ?? layer.styles[0].data['fill-opacity']
    );
  }

  circlePaint(layer: BaseLayer): any {
    const override = this.styleOverrideFor(layer);
    const styleData = layer.styles[0].data;
    const opacity = parseFloat(
      override?.fillOpacity ?? styleData['fill-opacity'] ?? '1'
    );
    const color = override?.fillColor ?? styleData['fill-color'];
    const strokeColor = styleData['fill-outline-color'] ?? '#ffffff';
    return {
      'circle-color': color,
      'circle-opacity': opacity,
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': strokeColor,
      'circle-stroke-opacity': 1,
    };
  }

  private styleOverrideFor(layer: BaseLayer): BaseLayerStyleOverride | null {
    const o = this.styleOverride;
    return o && (!o.appliesTo || o.appliesTo(layer)) ? o : null;
  }

  hoverOnLayer(event: MapMouseEvent, layer: BaseLayer, layerType: string) {
    this.enableBaseLayerHover$.pipe(take(1)).subscribe((paintingEnabled) => {
      if (paintingEnabled) {
        const layerName = layerType + layer.id;
        let queryGeometry:
          | maplibregl.PointLike
          | [maplibregl.PointLike, maplibregl.PointLike];
        if (layerType.includes('circle')) {
          // Use a Bounding Box for points, as a hover margin
          const radius = 10;
          queryGeometry = [
            [event.point.x - radius, event.point.y - radius],
            [event.point.x + radius, event.point.y + radius],
          ];
        } else {
          queryGeometry = event.point;
        }
        const features = this.mapLibreMap.queryRenderedFeatures(queryGeometry, {
          layers: [layerName],
        });
        if (features.length > 0) {
          const tooltipInfo: BaseLayerTooltipData = {
            content: this.createTooltipContent(layer, features[0]) ?? '',
            longLat: event.lngLat,
          };
          this.setTooltipData(tooltipInfo);
          this.paintHover(features[0]);
        }
      } else {
        this.hoverOutLayer();
      }
    });
  }

  hoverOutLayer() {
    this.setTooltipData(null);
    this.removeHover();
  }

  private paintHover(feature: MapGeoJSONFeature) {
    if (this.hoveredFeature && feature.id === this.hoveredFeature.id) {
      return;
    } else {
      // remove previous
      this.removeHover();
    }
    this.mapLibreMap.setFeatureState(
      {
        source: feature.source,
        sourceLayer: feature.sourceLayer,
        id: feature.id,
      },
      { hover: true }
    );
    this.hoveredFeature = feature;
  }

  private getTooltipTemplate(layer: BaseLayer): string | null {
    return layer.metadata?.modules?.map?.tooltip_format ?? null;
  }

  private createTooltipContent(
    layer: BaseLayer,
    feature: MapGeoJSONFeature
  ): string | null {
    const tooltipTemplate = this.getTooltipTemplate(layer)?.trim();
    if (!tooltipTemplate) {
      return null;
    } else {
      const tooltipString = tooltipTemplate.replace(
        /{(.*?)}/g,
        (match, key: string) => {
          const trimmedKey = key.trim();
          const propValue = feature.properties[trimmedKey] ?? '--';
          return propValue;
        }
      );
      return tooltipString ?? '';
    }
  }

  setTooltipData(tooltipInfo: BaseLayerTooltipData | null) {
    this.zone.run(() => {
      this._tooltipInfo$.next(tooltipInfo);
      this.changeDetectorRef.markForCheck();
    });
  }

  private removeHover() {
    if (this.hoveredFeature) {
      this.mapLibreMap.removeFeatureState({
        source: this.hoveredFeature?.source,
        sourceLayer: this.hoveredFeature.sourceLayer,
        id: this.hoveredFeature.id,
      });
      this.hoveredFeature = null;
    }
  }
}
