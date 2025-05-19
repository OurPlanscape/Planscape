import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import {
  ControlComponent,
  LayerComponent,
  PopupComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  LngLat,
} from 'maplibre-gl';
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
    PopupComponent,
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

  constructor(
    private baseLayersStateService: BaseLayersStateService,
    private dataLayersStateService: DataLayersStateService
  ) {}

  lineLayerPaint(layer: BaseLayer) {
    return defaultBaseLayerLine(layer.styles[0].data['fill-outline-color']);
  }

  fillLayerPaint(layer: BaseLayer) {
    return defaultBaseLayerFill(layer.styles[0].data['fill-color']);
  }

  hoverOnLayer(event: MapMouseEvent, layer: BaseLayer, layerType: string) {
    const layerName = layerType + layer.id;
    const features = this.mapLibreMap.queryRenderedFeatures(event.point, {
      layers: [layerName],
    });
    if (features.length > 0) {
      this.vectorTooltipLngLat = event.lngLat;
      this.setTooltipContent(layer, features[0]);
      this.paintHover(features[0]);
    }
  }

  private getTooltipTemplate(layer: BaseLayer): string | null {
    return layer.metadata?.modules?.map?.tooltip_format ?? null;
  }

  private setTooltipContent(layer: BaseLayer, feature: MapGeoJSONFeature) {
    //TODO: consider edge cases where templates or fields introduce fragility
    const tooltipTemplate = this.getTooltipTemplate(layer);
    if (!tooltipTemplate) {
      this.baseLayerTooltipContent = null;
      return;
    } else {
      const tooltipString = tooltipTemplate.replace(
        /{(.*?)}/g,
        (match, key: string) => {
          const trimmedKey = key.toLowerCase().trim();
          return feature.properties[trimmedKey] !== undefined
            ? feature.properties[trimmedKey]
            : match;
        }
      );
      if (tooltipString != '') {
        this.baseLayerTooltipContent = tooltipString;
      }
    }
  }

  hoverOutLayer() {
    this.baseLayerTooltipContent = null;
    this.vectorTooltipLngLat = null;
    this.removeHover();
  }

  selectedTab$ = this.dataLayersStateService.selectedLayerTab$;
  baseLayerTooltipContent: string | null = null;
  vectorTooltipLngLat: LngLat | null = null;

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
