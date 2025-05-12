import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import FeatureService from 'mapbox-gl-arcgis-featureserver';
import { Map as MapLibreMap } from 'maplibre-gl';
import { BaseLayer } from '@types';

@Component({
  selector: 'app-map-arcgis-vector-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class MapArcgisVectorLayerComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() layer!: BaseLayer;

  get layerId() {
    return 'arcgis_layer' + this.layer.id;
  }

  get sourceId() {
    return 'arcgis_source_' + this.layer.id;
  }

  private arcGisService: FeatureService | null = null;

  ngOnDestroy(): void {
    this.mapLibreMap.removeLayer(this.layerId);
    if (this.arcGisService) {
      this.arcGisService.destroySource();
    }
  }

  ngOnInit(): void {
    this.arcGisService = new FeatureService(this.sourceId, this.mapLibreMap, {
      url: this.layer.map_url,
      setAttributionFromService: false,
    });

    this.mapLibreMap.addLayer({
      id: this.layerId,
      source: this.sourceId,
      type: 'fill',
      paint: this.layer.styles[0].data,
    });
  }
}
