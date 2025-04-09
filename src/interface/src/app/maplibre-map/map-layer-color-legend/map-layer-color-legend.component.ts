import { Component } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import chroma from 'chroma-js';

@Component({
  selector: 'app-map-layer-color-legend',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, NgStyle],
  templateUrl: './map-layer-color-legend.component.html',
  styleUrl: './map-layer-color-legend.component.scss',
})
export class MapLayerColorLegendComponent {
  constructor(private dataLayerState: DataLayersStateService) {}

  colorLegendInfo$ = this.dataLayerState.colorLegendInfo$;

  setGradient() {
    this.gradientLabels = this.colorDetails.map((c) => c.entryLabel);
    const gradient = chroma
      .scale(this.colorDetails.map((c) => c.colorHex))
      .mode('lab')
      .colors(10);
    this.gradientStyle = `linear-gradient(to bottom, ${gradient.join(', ')})`;
  }

  // constructor(private dataLayerState: DataLayersStateService) {
  //   this.dataLayerState.colorLegendInfo$.subscribe((legendInfo: any) => {
  //     if (legendInfo) {
  //       this.mapType = legendInfo.type;
  //       this.colorDetails = legendInfo.entries;
  //       this.title = legendInfo.title;
  //       this.setGradient();
  //     }
  //   });
  // }

}
