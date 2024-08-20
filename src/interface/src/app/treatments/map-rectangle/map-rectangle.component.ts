import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { GeoJSONSource, LngLat, Map as MapLibreMap } from 'maplibre-gl';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { Polygon } from 'geojson';

/**
 * Draws a rectangle with given start and end LngLat coordinates.
 * Requires a MapLibreMap instance as @Input
 */
@Component({
  selector: 'app-map-rectangle',
  standalone: true,
  imports: [FeatureComponent, GeoJSONSourceComponent, LayerComponent],
  templateUrl: './map-rectangle.component.html',
})
export class MapRectangleComponent implements OnChanges {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() start!: LngLat | null;
  @Input() end!: LngLat | null;

  readonly sourceName = 'rectangle-source';

  rectangleGeometry: Polygon = {
    type: 'Polygon',
    coordinates: [[]],
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['start'] || changes['end']) {
      if (
        this.start === null &&
        this.end === null &&
        !changes['start'].isFirstChange()
      ) {
        this.updateRectangleGeometry([[]]);
      }

      if (!this.start || !this.end) {
        return;
      }
      const start = [this.start.lng, this.start.lat];
      const end = [this.end.lng, this.end.lat];
      this.updateRectangleGeometry([
        [start, [start[0], end[1]], end, [end[0], start[1]], start],
      ]);
    }
  }

  private updateRectangleGeometry(cords: number[][][]) {
    this.rectangleGeometry.coordinates = cords;
    (this.mapLibreMap.getSource(this.sourceName) as GeoJSONSource)?.setData(
      this.rectangleGeometry
    );
  }
}
