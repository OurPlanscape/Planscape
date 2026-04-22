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
  GeoJSONSourceComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
 SymbolLayerSpecification,
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

  type SymbolLayout = SymbolLayerSpecification['layout'];


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

    GeoJSONSourceComponent // TODO: for point test
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
    console.log('what is this:', this.mapLibreMap);
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

  private styleOverrideFor(layer: BaseLayer): BaseLayerStyleOverride | null {
    const o = this.styleOverride;
    return o && (!o.appliesTo || o.appliesTo(layer)) ? o : null;
  }

  hoverOnLayer(event: MapMouseEvent, layer: BaseLayer, layerType: string) {
    this.enableBaseLayerHover$.pipe(take(1)).subscribe((paintingEnabled) => {
      if (paintingEnabled) {
        const layerName = layerType + layer.id;
        const features = this.mapLibreMap.queryRenderedFeatures(event.point, {
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

  // Point-related helpers...maybe move to a separate component?
public testData: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }, // SF
      properties: { status: 'open' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-117.1611, 32.7157] }, // SD
      properties: { status: 'closed' }
    }
  ]
};

  public readonly testPointLayout: SymbolLayout = {
  'icon-image': [
    'match',
    ['get', 'status'],
    'open', 'icon-open',
    'closed', 'icon-closed',
    'icon-default'
  ] as any, // 'as any' is a must for 4.5.0 expressions
  'icon-size': 0.6,
  'icon-anchor': 'top'
};

public testLayout: SymbolLayout = {
  // 'icon-image': [
  //   'match',
  //   ['get', 'status'],
  //   'open', 'icon-open',
  //   'closed', 'icon-closed',
  //   'coming_soon', 'icon-soon',
  //   'icon-default' // Fallback
  // ] as any,
  'icon-image':'marker',
  'icon-size': 0.8,
  'icon-allow-overlap': true
};


  getPointLayout(layer: any) : SymbolLayout {
  return {
    'icon-image': [
      'match',  // pick specific icon
      ['get', 'status'],
      'open', 'icon-open',
      'closed', 'icon-closed',
      'coming_soon', 'icon-soon',
      'icon-default'
    ],

    'icon-size': 0.6,
    'icon-anchor': 'bottom', // Keeps the "point" of the pin on the coordinate

    'icon-allow-overlap': true, // Automatically hide icons that touch
    'icon-ignore-placement': false,
    };
}

  onMouseLeave() {

  }

  onMouseEnter() {}

  handlePointClick(e: MapMouseEvent) {}

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
