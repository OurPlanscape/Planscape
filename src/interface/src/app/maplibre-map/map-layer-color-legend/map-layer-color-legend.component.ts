import { Component, Input } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LayerStyleEntry } from '@types';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';

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

  constructor(private dataLayerState: DataLayersStateService) {
    this.dataLayerState.colorLegendInfo$.subscribe((legendInfo: any) => {
      this.colorDetails = legendInfo.entries;
      this.title = legendInfo.title;
    });
  }
}
