import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
import { AsyncPipe, NgForOf } from '@angular/common';
import {
  ControlComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
} from 'maplibre-gl';
import { BaseLayer } from '@types';

@Component({
  selector: 'app-map-base-layers',
  standalone: true,
  imports: [
    NgForOf,
    AsyncPipe,
    VectorSourceComponent,
    LayerComponent,
    ControlComponent,
  ],
  templateUrl: './map-base-layers.component.html',
  styleUrl: './map-base-layers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapBaseLayersComponent {
  @Input() mapLibreMap!: MapLibreMap;
  // only one hovered stand
  hoveredFeature: MapGeoJSONFeature | null = null;

  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;

  constructor(private baseLayersStateService: BaseLayersStateService) {}

  lineLayerPaint(layer: BaseLayer) {
    return {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        'black',
        layer.styles.data.paint['fill-outline-color'],
      ],
      'line-width': 1,
    } as any;
  }

  fillLayerPaint(layer: BaseLayer) {
    return {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        'black',
        layer.styles.data.paint['fill-color'],
      ],
      'fill-opacity': 0.5,
    } as any;
  }

  hoverOnLayer(event: MapMouseEvent, layerName: string) {
    const features = this.mapLibreMap.queryRenderedFeatures(event.point, {
      layers: [layerName],
    });

    if (features.length > 0) {
      this.paintHover(features[0]);
    }
  }

  hoverOutLayer() {
    this.removeHover();
  }

  private paintHover(feature: MapGeoJSONFeature) {
    if (this.hoveredFeature && feature.id === this.hoveredFeature.id) {
      return;
    }
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
