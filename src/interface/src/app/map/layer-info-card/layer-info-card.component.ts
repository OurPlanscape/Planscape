import { Component, Input } from '@angular/core';
import { DataLayerConfig, MetricConfig } from 'src/app/types';

@Component({
  selector: 'app-layer-info-card',
  templateUrl: './layer-info-card.component.html',
  styleUrls: ['./layer-info-card.component.scss'],
})
export class LayerInfoCardComponent {
  @Input() dataLayerConfig?: DataLayerConfig | null;

  hasDataProvider(): boolean {
    return (
      !!this.dataLayerConfig?.data_provider &&
      !!this.dataLayerConfig.data_download_link
    );
  }

  hasMinMax(): boolean {
    return (
      this.dataLayerConfig?.min_value != undefined &&
      this.dataLayerConfig?.max_value != undefined
    );
  }

  hasReferenceLink(): boolean {
    return !!this.dataLayerConfig?.reference_link;
  }

  hasSource(): boolean {
    return !!this.dataLayerConfig?.source && !!this.dataLayerConfig.source_link;
  }

  hasYear(): boolean {
    return !!this.dataLayerConfig?.data_year;
  }

  computeMinMax(): number[] {
    if (this.dataLayerConfig?.normalized) {
      return [-1, 1];
    } else {
      return [
        this.dataLayerConfig?.min_value!,
        this.dataLayerConfig?.max_value!,
      ];
    }
  }

  dataUnits(): string | undefined {
    return (this.dataLayerConfig as MetricConfig)?.data_units;
  }
}
