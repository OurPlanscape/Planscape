import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
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
    private zone: NgZone
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
    return defaultBaseLayerLine(layer.styles[0].data['fill-outline-color']);
  }

  fillLayerPaint(layer: BaseLayer) {
    return defaultBaseLayerFill(
      layer.styles[0].data['fill-color'],
      layer.styles[0].data['fill-opacity']
    );
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
          // note: we don't have control over external props being lower/uppercase
          const propValue =
            feature.properties[trimmedKey] ?? // given, possibly mixed case
            feature.properties[trimmedKey.toLowerCase()] ?? // all lower
            feature.properties[trimmedKey.toUpperCase()] ?? // all upper
            '--';
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
