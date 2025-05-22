import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import {
  ControlComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  LngLat,
} from 'maplibre-gl';
import { MapBaseLayerTooltipComponent, BaseLayerTooltipData } from '../map-base-layer-tooltip/map-base-layer-tooltip.component';
import { BaseLayer } from '@types';
import { UntilDestroy } from '@ngneat/until-destroy';
import { MapArcgisVectorLayerComponent } from '../map-arcgis-vector-layer/map-arcgis-vector-layer.component';
import { defaultBaseLayerFill, defaultBaseLayerLine } from '../maplibre.helper';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { MatTab } from '@angular/material/tabs';

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
    ControlComponent,
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
  selectedTab$ = this.dataLayersStateService.selectedLayerTab$;
  currentTooltipInfo$ = this.dataLayersStateService.tooltipInfo$;
  baseLayerTooltipContent: string | null = null;
  vectorTooltipLngLat: LngLat | null = null;

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

  // hoverOnArcLayer(event: MapLayerMouseEvent, layer: BaseLayer) {
  //   const features = event.features?.[0];
  //   if (features) {
  //     this.vectorTooltipLngLat = event.lngLat;
  //     this.setTooltipContent(layer, features);
  //   }
  // }

  hoverOnLayer(event: MapMouseEvent, layer: BaseLayer, layerType: string) {
    const layerName = layerType + layer.id;
    const features = this.mapLibreMap.queryRenderedFeatures(event.point, {
      layers: [layerName],
    });
    if (features.length > 0) {
      this.vectorTooltipLngLat = event.lngLat;
      const tooltipInfo: BaseLayerTooltipData = {
        feature: features[0],
        layer: layer,
        template: '',
        longLat: event.lngLat,
      };
      this.dataLayersStateService.setTooltipData(tooltipInfo);
      this.paintHover(features[0]);
    }
  }

  hoverOutLayer() {
    this.baseLayerTooltipContent = null;
    this.dataLayersStateService.setTooltipData(null);
    this.removeHover();
  }

  onBaseLayerTab(tab: MatTab): boolean {
    return tab && tab.textLabel === 'Base Layers';
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
