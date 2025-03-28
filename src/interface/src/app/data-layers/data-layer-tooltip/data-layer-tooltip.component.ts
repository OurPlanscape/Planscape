import { Component, Input, OnInit } from '@angular/core';
import { MetricConfig } from '@types';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [NgIf, MatButtonModule, ButtonComponent],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent implements OnInit {
  @Input() layer!: any;

  ngOnInit(): void {
    console.log('############### Layer: ', this.layer);
  }

  computeMinMax(): number[] {
    return [
      this.layer.item?.info?.stats?.[0]?.min!,
      this.layer.item?.info?.stats?.[0]?.max!,
    ];
  }

  dataUnits(): string | undefined {
    if (this.layer.normalized) {
      return 'Normalized';
    } else {
      return (this.layer as MetricConfig)?.data_units;
    }
  }

  hasDataProvider(): boolean {
    return !!this.layer.data_provider;
  }

  hasDownloadLink(): boolean {
    return !!this.layer.data_download_link;
  }

  hasMinMax(): boolean {
    return (
      this.layer.item?.info?.stats?.[0]?.min != undefined &&
      this.layer.item?.info?.stats?.[0]?.max != undefined
    );
  }

  hasReferenceLink(): boolean {
    return !!this.layer.reference_link;
  }

  hasSource(): boolean {
    return !!this.layer.source && !!this.layer.source_link;
  }
}
