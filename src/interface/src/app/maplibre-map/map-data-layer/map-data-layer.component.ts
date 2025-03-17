import { Component, Input, OnChanges } from '@angular/core';
import { makeColorFunction } from '../../data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import { HttpClient } from '@angular/common/http';
import {
  LayerComponent,
  RasterSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { DataLayer } from '@types';

@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [LayerComponent, RasterSourceComponent],
  templateUrl: './map-data-layer.component.html',
  styleUrl: './map-data-layer.component.scss',
})
export class MapDataLayerComponent implements OnChanges {
  OPACITY = 0.75;
  @Input() dataLayer!: DataLayer | null;
  cogUrl = '';

  //TODO: remove--example only
  stylesUrl = '/assets/cogstyles/example.json';

  constructor(private readonly client: HttpClient) {}

  ngOnChanges() {
    if (this.dataLayer?.public_url) {
      this.cogUrl = `cog://${this.dataLayer?.public_url}`;
      //TODO: fetch associated styles for this image when available
      this.client.get(this.stylesUrl).subscribe((styleJson) => {
        const colorFn = makeColorFunction(styleJson as any);
        setColorFunction(this.dataLayer?.public_url ?? '', colorFn);
      });
    }
  }
}
