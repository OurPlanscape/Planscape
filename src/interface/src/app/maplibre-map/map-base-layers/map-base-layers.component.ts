import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
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
import { MapBaseLayerTooltipComponent } from '../map-base-layer-tooltip/map-base-layer-tooltip.component';
import { BaseLayer, BaseLayerTooltipData } from '@types';
import { UntilDestroy } from '@ngneat/until-destroy';
import { MapArcgisVectorLayerComponent } from '../map-arcgis-vector-layer/map-arcgis-vector-layer.component';
import { defaultBaseLayerFill, defaultBaseLayerLine } from '../maplibre.helper';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { take } from 'rxjs';

@UntilDestroy()
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
export class MapBaseLayersComponent {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() before = '';

  // only one hovered stand
  hoveredFeature: MapGeoJSONFeature | null = null;
  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;
  enableBaseLayerHover$ = this.dataLayersStateService.enableBaseLayerHover$;
  currentTooltipInfo$ = this.dataLayersStateService.tooltipInfo$;

  constructor(
    private baseLayersStateService: BaseLayersStateService,
    private dataLayersStateService: DataLayersStateService
  ) { }

  lineLayerPaint(layer: BaseLayer) {
    return defaultBaseLayerLine(layer.styles[0].data['fill-outline-color']);
  }

  fillLayerPaint(layer: BaseLayer) {
    return defaultBaseLayerFill(layer.styles[0].data['fill-color']);
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
          this.dataLayersStateService.setTooltipData(tooltipInfo);
          this.paintHover(features[0]);
        }
      }
    });
  }

  hoverOutLayer() {
    this.dataLayersStateService.setTooltipData(null);
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
            feature.properties[trimmedKey.toLowerCase()] ??
            feature.properties[trimmedKey.toUpperCase()] ??
            '--';
          return propValue;
        }
      );
      return tooltipString ?? '';
    }
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
