import { Component } from '@angular/core';
import {

  ControlComponent,
  PopupComponent,
} from '@maplibre/ngx-maplibre-gl';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { LngLat, MapGeoJSONFeature } from 'maplibre-gl';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { BaseLayer } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

export interface BaseLayerTooltipData {
  template: string;
  layer: BaseLayer;
  feature: MapGeoJSONFeature;
  longLat: LngLat;
}

@UntilDestroy()
@Component({
  selector: 'app-map-base-layer-tooltip',
  standalone: true,
  imports: [
    NgForOf,
    AsyncPipe,
    PopupComponent,
    ControlComponent,
    NgIf,
  ],
  templateUrl: './map-base-layer-tooltip.component.html',
  styleUrl: './map-base-layer-tooltip.component.scss'
})
export class MapBaseLayerTooltipComponent {

  constructor(private dataLayersStateService: DataLayersStateService
  ) {

    this.dataLayersStateService.tooltipInfo$
      .pipe(untilDestroyed(this))
      .subscribe((info: BaseLayerTooltipData | null) => {
        console.log('here is the tooltipLongLat:', info?.longLat);

        this.tooltipLongLat = info?.longLat;
        if (info?.layer) {
          this.baseLayerTooltipContent = this.setTooltipContent(info?.layer, info?.feature)
        }
        console.log('here is the baseLayerTooltipContent:', this.baseLayerTooltipContent);
      });

  }

  tooltipLongLat: LngLat | undefined = undefined;
  baseLayerTooltipContent: string | null = null;

  private getTooltipTemplate(layer: BaseLayer): string | null {
    return layer.metadata?.modules?.map?.tooltip_format ?? null;
  }

  private setTooltipContent(layer: BaseLayer, feature: MapGeoJSONFeature): string | null {
    const tooltipTemplate = this.getTooltipTemplate(layer)?.trim();
    if (!tooltipTemplate) {
      this.baseLayerTooltipContent = null;
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


}
