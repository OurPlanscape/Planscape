import { Component, Input } from '@angular/core';
import { AsyncPipe, NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { ColorLegendInfo, LayerStyleEntry, RasterColorType } from '@types';
import { tap } from 'rxjs';
import { scaleLinear } from 'd3-scale';

@Component({
  selector: 'app-map-layer-color-legend',
  standalone: true,
  imports: [AsyncPipe, NgClass, NgFor, NgIf, NgStyle],
  templateUrl: './map-layer-color-legend.component.html',
  styleUrl: './map-layer-color-legend.component.scss',
})
export class MapLayerColorLegendComponent {
  constructor(private dataLayerState: DataLayersStateService) {}

  @Input() size: 'compact' | 'full' = 'full';
  gradientLabels: string[] = [];
  gradientStyle = '';
  colorType: RasterColorType = 'RAMP';

  colorLegendInfo$ = this.dataLayerState.colorLegendInfo$.pipe(
    tap((newColorLegendInfo: ColorLegendInfo | null) => {
      if (newColorLegendInfo?.entries) {
        this.colorType = newColorLegendInfo.type;
        this.setGradient(newColorLegendInfo?.entries);
      }
    })
  );

  setGradient(entries: LayerStyleEntry[]) {
    this.gradientLabels = entries.map((entry) => entry.entryLabel);
    const steps = 100;
    const positions = Array.from(
      { length: entries.length },
      (_, i) => i / (entries.length - 1)
    );
    const colorStrings = entries.map((entry) => entry.colorHex);
    const colorScale = scaleLinear<string>()
      .domain(positions)
      .range(colorStrings)
      .clamp(true);
    const gradient = Array.from({ length: steps }, (_, i) => {
      const t = i / (steps - 1);
      return colorScale(t);
    });

    this.gradientStyle = `linear-gradient(to bottom, ${gradient.join(', ')})`;
  }
}
