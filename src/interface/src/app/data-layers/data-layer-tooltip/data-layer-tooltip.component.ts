import { Component, Input, OnInit } from '@angular/core';
import { DataLayersStateService } from '../data-layers.state.service';
import { MetricConfig } from '@types';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [NgIf, MatButtonModule],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent implements OnInit {
  @Input() layer!: any;

  constructor(private dataLayerState: DataLayersStateService) {}

  ngOnInit(): void {
    this.dataLayerState.selectedDataLayer$.subscribe((dataLayer) => {
      console.log('Data layer selected: ', dataLayer);
    });

    this.dataLayerState.selectedDataSet$.subscribe((dataset) => {
      // console.log('Data Set: ', dataset);
    });

    this.dataLayerState.dataSets$.subscribe((datasets) => {
      //console.log('DataSerts: ', datasets);
    });

    console.log('############### Layer: ', this.layer);
  }

  computeMinMax(): number[] {
    return [
      this.layer?.item?.info?.stats?.[0]?.min!,
      this.layer?.item?.info?.stats?.[0]?.max!,
    ];
  }

  dataUnits(): string | undefined {
    if (this.layer?.normalized) {
      return 'Normalized';
    } else {
      return (this.layer as MetricConfig)?.data_units;
    }
  }

  hasDataProvider(): boolean {
    return !!this.layer?.data_provider;
  }

  hasDownloadLink(): boolean {
    return !!this.layer?.data_download_link;
  }

  hasMinMax(): boolean {
    return (
      this.layer?.min_value != undefined && this.layer?.max_value != undefined
    );
  }

  hasReferenceLink(): boolean {
    return !!this.layer?.reference_link;
  }

  hasSource(): boolean {
    return !!this.layer?.source && !!this.layer.source_link;
  }
}
