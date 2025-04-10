import { Component } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { ColorLegendInfo, LayerStyleEntry, MapType } from '@types';
import { tap } from 'rxjs';

@Component({
  selector: 'app-map-layer-color-legend',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, NgStyle],
  templateUrl: './map-layer-color-legend.component.html',
  styleUrl: './map-layer-color-legend.component.scss',
})
export class MapLayerColorLegendComponent {
  constructor(private dataLayerState: DataLayersStateService) {}

  gradientLabels: string[] = [];
  gradientStyle = '';
  mapType: MapType = 'RAMP';

  colorLegendInfo$ = this.dataLayerState.colorLegendInfo$.pipe(
    tap((newColorLegendInfo: ColorLegendInfo | null) => {
      if (newColorLegendInfo?.entries) {
        this.setGradient(newColorLegendInfo?.entries);
      }
    })
  );

  setGradient(entries: LayerStyleEntry[]) {
    this.gradientLabels = entries.map((entry) => entry.entryLabel);
    const hexColors = entries.map((entry) => entry.colorHex);
    this.gradientStyle = `linear-gradient(to bottom, ${hexColors.join(', ')})`;
  }
}
