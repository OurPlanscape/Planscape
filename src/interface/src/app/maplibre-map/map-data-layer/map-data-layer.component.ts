import { Component } from '@angular/core';
import { makeColorFunction } from '../../data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import {
  LayerComponent,
  RasterSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { DataLayer } from '@types';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [LayerComponent, RasterSourceComponent],
  templateUrl: './map-data-layer.component.html',
  styleUrl: './map-data-layer.component.scss',
})
export class MapDataLayerComponent {
  OPACITY = 0.75;
  cogUrl = '';

  constructor(dataLayersStateService: DataLayersStateService) {
    dataLayersStateService.selectedDataLayer$.pipe(untilDestroyed(this)).subscribe((dataLayer: DataLayer | null) => {
      if (dataLayer?.public_url) {
        this.cogUrl = `cog://${dataLayer?.public_url}`;
        const colorFn = makeColorFunction(dataLayer?.styles as any);
        setColorFunction(dataLayer?.public_url ?? '', colorFn);
      }
    });
  }

}
