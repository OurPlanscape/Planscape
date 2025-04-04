import { Component, Input } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LayerStyleEntry } from '@types';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import chroma from 'chroma-js';

@Component({
  selector: 'app-map-layer-color-legend',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, NgStyle, MatIconModule, MatTooltipModule],
  templateUrl: './map-layer-color-legend.component.html',
  styleUrl: './map-layer-color-legend.component.scss',
})
export class MapLayerColorLegendComponent {
  @Input() title: string = '';

  colorDetails: LayerStyleEntry[] = [];
  colorLegendInfo$ = this.dataLayerState.colorLegendInfo$;
  mapType: 'RAMP' | 'INTERVALS' | 'VALUES' = 'RAMP';
  gradientStyle = '';
  gradientLabels: string[] = [];

  setGradient() {
    this.gradientLabels = this.colorDetails.map((c) => c.entryLabel);
    const gradient = chroma
      .scale(this.colorDetails.map((c) => c.colorHex))
      .mode('lab')
      .colors(10);
    this.gradientStyle = `linear-gradient(to bottom, ${gradient.join(', ')})`;
  }

  constructor(private dataLayerState: DataLayersStateService) {
    this.dataLayerState.colorLegendInfo$.subscribe((legendInfo: any) => {
      if (legendInfo) {
        this.mapType = legendInfo.type;
        this.colorDetails = legendInfo.entries;
        this.title = legendInfo.title;
        this.setGradient();
      }
    });
  }
}
