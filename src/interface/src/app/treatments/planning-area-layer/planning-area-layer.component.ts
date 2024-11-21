import { Component, Input } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-planning-area-layer',
  standalone: true,
  imports: [FeatureComponent, GeoJSONSourceComponent, LayerComponent],
  templateUrl: './planning-area-layer.component.html',
})
export class PlanningAreaLayerComponent {
  private _polygonGeometry!: any;

  @Input()
  get polygonGeometry(): any {
    return this._polygonGeometry;
  }

  set polygonGeometry(value: any) {
    this._polygonGeometry = value;
    this.updateArea()
  }
  @Input() mapLibreMap!: MapLibreMap;

  readonly sourceName = 'tratment-planing-area';

  private updateArea() {
    (this.mapLibreMap?.getSource(this.sourceName) as GeoJSONSource)?.setData(
      this.polygonGeometry
    );
  }
}
