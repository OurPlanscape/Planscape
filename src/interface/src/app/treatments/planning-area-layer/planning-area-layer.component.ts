import { Component, Input, OnInit } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { Geometry } from 'geojson';
import { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-planning-area-layer',
  standalone: true,
  imports: [FeatureComponent, GeoJSONSourceComponent, LayerComponent],
  templateUrl: './planning-area-layer.component.html',
})
export class PlanningAreaLayerComponent implements OnInit {
  @Input() polygonGeometry!: Geometry;
  @Input() mapLibreMap!: MapLibreMap;

  readonly sourceName = 'tratment-planing-area';

  ngOnInit(): void {
    this.updateArea();
  }

  private updateArea() {
    (this.mapLibreMap.getSource(this.sourceName) as GeoJSONSource)?.setData(
      this.polygonGeometry
    );
  }
}
