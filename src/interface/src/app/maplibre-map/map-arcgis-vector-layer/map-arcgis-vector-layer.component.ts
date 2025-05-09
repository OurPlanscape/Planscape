import { Component, Input, OnDestroy } from '@angular/core';
import FeatureService from 'mapbox-gl-arcgis-featureserver';
import { Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-map-arcgis-vector-layer',
  standalone: true,
  imports: [],
  templateUrl: './map-arcgis-vector-layer.component.html',
  styleUrl: './map-arcgis-vector-layer.component.scss',
})
export class MapArcgisVectorLayerComponent implements OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() layerId!: string;

  private arcGisService = new FeatureService(this.layerId, this.mapLibreMap, {
    url: 'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/FeatureServer/6',
  });

  ngOnDestroy(): void {
    const layerId = 'layerID'; // TODO
    this.mapLibreMap.removeLayer(layerId);
    this.arcGisService.destroySource();
  }
}
