import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import FeatureService from 'mapbox-gl-arcgis-featureserver';
import {
  Map as MapLibreMap,
  MapLayerMouseEvent,
  LngLat,
  MapGeoJSONFeature,
} from 'maplibre-gl';
import { BaseLayer, BaseLayerTooltipData } from '@types';
import { defaultBaseLayerFill, defaultBaseLayerLine } from '../maplibre.helper';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-map-arcgis-vector-layer',
  standalone: true,
  template: '',
})
export class MapArcgisVectorLayerComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() layer!: BaseLayer;
  @Input() before = '';

  private hoveredId: number | null = null;

  private arcGisService: FeatureService | null = null;

  constructor(private dataLayersStateService: DataLayersStateService) {}

  ngOnInit(): void {
    this.addArcgisLayers();
  }

  enableBaseLayerHover$ = this.dataLayersStateService.enableBaseLayerHover$;

  ngOnDestroy(): void {
    this.mapLibreMap.off('mousemove', this.layerFillId, this.onMouseMove);
    this.mapLibreMap.off('mouseleave', this.layerFillId, this.onMouseLeave);
    this.mapLibreMap.off('styledata', this.onStyleDataListener);
    this.clearHover();

    this.mapLibreMap.removeLayer(this.layerFillId);
    this.mapLibreMap.removeLayer(this.layerLineId);

    this.arcGisService?.destroySource();
  }

  private get layerFillId() {
    return 'arcgis_layer_fill_' + this.layer.id;
  }

  private get layerLineId() {
    return 'arcgis_layer_line_' + this.layer.id;
  }

  private get sourceId() {
    return 'arcgis_source_' + this.layer.id;
  }

  private clearHover = () => {
    if (this.hoveredId !== null) {
      this.mapLibreMap.setFeatureState(
        { source: this.sourceId, id: this.hoveredId },
        { hover: false }
      );
      this.hoveredId = null;
      this.clearTooltip();
    }
  };

  private onMouseMove = (e: MapLayerMouseEvent) => {
    this.enableBaseLayerHover$.pipe(take(1)).subscribe((paintingEnabled) => {
      if (paintingEnabled) {
        const f = e.features?.[0];
        if (!f) {
          this.clearHover();
          return;
        }
        const id = f.id as number;
        if (id !== this.hoveredId) {
          this.clearHover();
          this.hoveredId = id;
          this.mapLibreMap.setFeatureState(
            { source: this.sourceId, id },
            { hover: true }
          );
          this.setTooltipInfo(e.lngLat, f);
        }
      }
    });
  };

  private clearTooltip() {
    this.dataLayersStateService.setTooltipData(null);
  }

  private setTooltipInfo(longLat: LngLat, f: MapGeoJSONFeature) {
    const tooltipInfo: BaseLayerTooltipData = {
      content: this.createTooltipContent(this.layer, f) ?? '',
      longLat: longLat,
    };
    this.dataLayersStateService.setTooltipData(tooltipInfo);
  }

  private onMouseLeave = () => this.clearHover();

  private addArcgisLayers() {
    this.arcGisService = new FeatureService(this.sourceId, this.mapLibreMap, {
      url: this.layer.map_url,
      setAttributionFromService: false,
      // add options provided on metadata
      ...(this.layer.metadata?.['map']?.['arcgis'] ?? {}),
    });

    this.mapLibreMap.addLayer(
      {
        id: this.layerLineId,
        source: this.sourceId,
        type: 'line',
        paint: defaultBaseLayerLine(
          this.layer.styles[0].data['fill-outline-color']
        ),
      },
      this.before
    );

    this.mapLibreMap.addLayer(
      {
        id: this.layerFillId,
        source: this.sourceId,
        type: 'fill',
        paint: defaultBaseLayerFill(
          this.layer.styles[0].data['fill-outline-color']
        ),
      },
      this.layerLineId
    );

    this.mapLibreMap.on('mousemove', this.layerFillId, this.onMouseMove);
    this.mapLibreMap.on('mouseleave', this.layerFillId, this.onMouseLeave);
    this.mapLibreMap.on('styledata', this.onStyleDataListener);
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

  private onStyleDataListener = () => {
    if (this.mapLibreMap && !this.mapLibreMap.getSource(this.sourceId)) {
      this.addArcgisLayers();
    }
  };
}
