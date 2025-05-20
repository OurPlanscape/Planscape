import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import FeatureService from 'mapbox-gl-arcgis-featureserver';
import { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { BaseLayer } from '@types';
import { defaultBaseLayerFill, defaultBaseLayerLine } from '../maplibre.helper';

@Component({
  selector: 'app-map-arcgis-vector-layer',
  standalone: true,
  template: '',
})
export class MapArcgisVectorLayerComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() layer!: BaseLayer;
  @Input() before = '';

  // it doesn't appear that we can use onMouseMove in the template, so refiring something to trigger tooltips
  @Output() mouseHover = new EventEmitter<MapLayerMouseEvent>();

  private hoveredId: number | null = null;

  private arcGisService: FeatureService | null = null;

  ngOnInit(): void {
    this.addArcgisLayers();
  }

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
    }
  };

  private onMouseMove = (e: MapLayerMouseEvent) => {
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
    }
    this.mouseHover.emit(e);
  };

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

  private onStyleDataListener = () => {
    if (this.mapLibreMap && !this.mapLibreMap.getSource(this.sourceId)) {
      this.addArcgisLayers();
    }
  };
}
